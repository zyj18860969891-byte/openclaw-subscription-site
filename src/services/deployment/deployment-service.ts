import { railwayClient } from './railway-client';
import { PrismaClient } from '@prisma/client';
import { generateEnvVariables } from './env-variable-generator';

// 数据库客户端
const prisma = new PrismaClient();

/**
 * 部署服务配置
 */
interface DeploymentConfig {
  templateServiceId: string;
  templateProjectId?: string;
  defaultTimeoutMs: number;
  maxRetries: number;
}

/**
 * 部署结果
 */
interface DeploymentResult {
  success: boolean;
  projectId?: string;
  serviceId?: string;
  serviceUrl?: string;
  error?: string;
  deploymentTime: number;
}

/**
 * 部署状态枚举
 */
enum DeploymentStatus {
  PENDING = 'pending',
  CREATING = 'creating',
  CONFIGURING = 'configuring',
  DEPLOYING = 'deploying',
  RUNNING = 'running',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

/**
 * 自动部署服务
 * 负责在用户支付成功后自动创建和配置 Railway 实例
 */
export class DeploymentService {
  private config: DeploymentConfig;

  constructor(config: Partial<DeploymentConfig> = {}) {
    this.config = {
      templateServiceId: config.templateServiceId || process.env.RAILWAY_TEMPLATE_SERVICE_ID || '',
      templateProjectId: config.templateProjectId || process.env.RAILWAY_TEMPLATE_PROJECT_ID,
      defaultTimeoutMs: config.defaultTimeoutMs || 300000, // 5分钟
      maxRetries: config.maxRetries || 3,
    };

    // 验证配置
    if (!this.config.templateServiceId) {
      throw new Error('Template service ID is required for deployment');
    }
  }

  /**
   * 为新订阅创建 Railway 实例
   * @param subscriptionId 订阅ID
   * @returns 部署结果
   */
  async deployNewInstance(subscriptionId: string): Promise<DeploymentResult> {
    const startTime = Date.now();
    
    try {
      // 获取订阅信息
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          user: true,
          channelCredentials: true,
          payments: {
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      if (subscription.channelCredentials.length === 0) {
        throw new Error('No channel credentials found for subscription');
      }

      if (subscription.payments.length === 0) {
        throw new Error('No successful payment found for subscription');
      }

      // 生成实例名称
      const instanceName = this.generateInstanceName(subscription);

      console.log(`Starting deployment for subscription ${subscriptionId}: ${instanceName}`);

      // 步骤1: 克隆服务
      console.log('Step 1: Cloning service...');
      const clonedService = await this.cloneServiceWithRetry(instanceName);
      
      // 步骤2: 生成环境变量
      console.log('Step 2: Generating environment variables...');
      const envVars = await generateEnvVariables(subscription.id);
      
      // 步骤3: 配置环境变量
      console.log('Step 3: Configuring environment variables...');
      await railwayClient.setEnvironmentVariables(clonedService.id, envVars);
      
      // 步骤4: 触发部署
      console.log('Step 4: Triggering deployment...');
      await railwayClient.triggerDeployment(clonedService.id);
      
      // 步骤5: 监控部署状态
      console.log('Step 5: Monitoring deployment...');
      const monitorResult = await railwayClient.monitorDeployment(
        clonedService.id,
        this.config.defaultTimeoutMs
      );

      if (!monitorResult.success) {
        throw new Error(monitorResult.error || 'Deployment failed');
      }

      // 步骤6: 保存实例信息到数据库
      console.log('Step 6: Saving instance information...');
      await this.saveRailwayInstance(subscriptionId, clonedService, monitorResult.url!);

      const deploymentTime = Date.now() - startTime;
      
      return {
        success: true,
        projectId: clonedService.projectId,
        serviceId: clonedService.id,
        serviceUrl: monitorResult.url,
        deploymentTime,
      };

    } catch (error) {
      console.error(`Deployment failed for subscription ${subscriptionId}:`, error);
      
      // 记录部署失败
      await this.logDeploymentFailure(subscriptionId, error instanceof Error ? error.message : 'Unknown error');
      
      // 更新订阅状态为部署失败
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { 
          status: 'FAILED' as any,
          updatedAt: new Date(),
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deploymentTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 带重试机制的服务克隆
   */
  private async cloneServiceWithRetry(serviceName: string, retryCount = 0): Promise<any> {
    try {
      return await railwayClient.cloneService(
        this.config.templateServiceId,
        serviceName,
        this.config.templateProjectId
      );
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        console.log(`Clone failed, retrying (${retryCount + 1}/${this.config.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
        return this.cloneServiceWithRetry(serviceName, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 生成实例名称
   */
  private generateInstanceName(subscription: any): string {
    const timestamp = Date.now();
    const userId = subscription.user.id.slice(0, 8); // 取用户ID前8位
    const planType = subscription.planType;
    
    return `openclaw-${planType}-${userId}-${timestamp}`;
  }

  /**
   * 保存Railway实例信息到数据库
   */
  private async saveRailwayInstance(
    subscriptionId: string,
    service: any,
    serviceUrl: string
  ): Promise<void> {
    await prisma.railwayInstance.create({
      data: {
        subscriptionId,
        userId: '', // 需要从订阅中获取
        projectId: service.projectId,
        projectName: service.name,
        serviceId: service.id,
        serviceName: service.name,
        environmentId: '', // 需要从环境获取
        status: 'RUNNING',
        deploymentStatus: 'RUNNING',
        publicUrl: serviceUrl,
        variables: {}, // 可以存储环境变量快照
      },
    });
  }

  /**
   * 记录部署失败
   */
  private async logDeploymentFailure(subscriptionId: string, error: string): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO deployment_logs (subscription_id, error_message, created_at)
      VALUES (${subscriptionId}, ${error}, ${new Date()})
    `;
  }

  /**
   * 获取订阅的部署状态
   */
  async getDeploymentStatus(subscriptionId: string): Promise<{
    status: DeploymentStatus;
    serviceUrl?: string;
    error?: string;
    deploymentTime?: number;
  }> {
    const instance = await prisma.railwayInstance.findFirst({
      where: { subscriptionId },
    });

    if (!instance) {
      return { status: DeploymentStatus.PENDING };
    }

    try {
      const service = await railwayClient.getService(instance.serviceId);
      
      switch (service.status) {
        case 'running':
          return {
            status: DeploymentStatus.RUNNING,
            serviceUrl: service.publicDomain,
          };
        case 'creating':
          return { status: DeploymentStatus.CREATING };
        case 'stopped':
          return { status: DeploymentStatus.FAILED };
        case 'failed':
          return { 
            status: DeploymentStatus.FAILED,
            error: 'Service failed to start',
          };
        default:
          return { status: DeploymentStatus.PENDING };
      }
    } catch (error) {
      return {
        status: DeploymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 重试部署
   */
  async retryDeployment(subscriptionId: string): Promise<DeploymentResult> {
    // 检查是否已有部署实例
    const existingInstance = await prisma.railwayInstance.findFirst({
      where: { subscriptionId },
    });

    if (existingInstance) {
      // 删除旧实例
      try {
        await railwayClient.deleteService(existingInstance.serviceId);
        await prisma.railwayInstance.delete({
          where: { id: existingInstance.id },
        });
      } catch (error) {
        console.warn('Failed to delete existing instance:', error);
      }
    }

    // 重新部署
    return this.deployNewInstance(subscriptionId);
  }

  /**
   * 取消部署
   */
  async cancelDeployment(subscriptionId: string): Promise<void> {
    const instance = await prisma.railwayInstance.findFirst({
      where: { subscriptionId },
    });

    if (instance) {
      try {
        await railwayClient.deleteService(instance.serviceId);
        await prisma.railwayInstance.delete({
          where: { id: instance.id },
        });
      } catch (error) {
        console.error('Failed to cancel deployment:', error);
        throw error;
      }
    }
  }

  /**
   * 获取部署日志
   */
  async getDeploymentLogs(subscriptionId: string): Promise<string> {
    const instance = await prisma.railwayInstance.findFirst({
      where: { subscriptionId },
    });

    if (!instance) {
      throw new Error('No deployment instance found');
    }

    return railwayClient.getServiceLogs(instance.serviceId);
  }
}

// 导出单例实例
export const deploymentService = new DeploymentService();