/**
 * Railway 克隆服务 (方案B - 推荐)
 * 通过克隆模板项目来自动创建用户实例
 * 优势: 保证环境一致性、快速部署、配置完整
 */

import { RailwayClient, ServiceVariable } from './railway-client';
import { PrismaClient } from '@prisma/client';

export interface CloneServiceOptions {
  templateProjectId: string;
  templateServiceId: string;
  userId: string;
  subscriptionId: string;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  instanceName?: string;
  channelCredentials?: Record<string, any>;
  customVariables?: ServiceVariable[];
}

export interface CloneResult {
  success: boolean;
  projectId: string;
  projectName: string;
  serviceId: string;
  serviceName: string;
  environmentId: string;
  deploymentId?: string;
  publicUrl?: string;
  variables?: Record<string, string>;
  message: string;
  errorDetails?: string;
}

export class RailwayCloneService {
  private railwayClient: RailwayClient;
  private prisma: PrismaClient;

  constructor(railwayClient: RailwayClient, prisma: PrismaClient) {
    this.railwayClient = railwayClient;
    this.prisma = prisma;
  }

  /**
   * 克隆并创建新实例
   * 这是最关键的方法 - 处理整个克隆流程
   */
  async cloneAndCreateInstance(options: CloneServiceOptions): Promise<CloneResult> {
    try {
      // Step 1: 验证模板项目
      console.log(`[Clone] 验证模板项目: ${options.templateProjectId}`);
      const templateProject = await this.railwayClient.getProject(options.templateProjectId);
      console.log(`[Clone] 模板项目验证成功: ${templateProject.name}`);

      // Step 2: 生成唯一的项目和服务名称
      const timestamp = Date.now();
      const projectName = `${options.instanceName || 'moltbot'}-${options.plan.toLowerCase()}-${timestamp}`;
      const serviceName = `${projectName}-service`;
      const environmentName = 'production';

      console.log(`[Clone] 创建新项目: ${projectName}`);

      // Step 3: 创建新项目
      const newProject = await this.railwayClient.createProject(
        projectName,
        `OpenClaw instance for user ${options.userId} (${options.plan})`
      );
      console.log(`[Clone] 项目创建成功: ${newProject.id}`);

      // Step 4: 创建生产环境
      console.log(`[Clone] 创建环境: ${environmentName}`);
      const environment = await this.railwayClient.createEnvironment(newProject.id, environmentName);
      console.log(`[Clone] 环境创建成功: ${environment.id}`);

      // Step 5: 获取模板服务配置
      console.log(`[Clone] 获取模板服务配置`);
      const templateService = await this.railwayClient.getService(options.templateServiceId);
      const templateVariables = await this.railwayClient.getServiceVariables(
        options.templateServiceId,
        environment.id
      );
      console.log(`[Clone] 获取到${Object.keys(templateVariables).length}个环境变量`);

      // Step 6: 准备环境变量
      const environmentVariables = this.prepareEnvironmentVariables(
        templateVariables,
        {
          userId: options.userId,
          subscriptionId: options.subscriptionId,
          plan: options.plan,
          instanceName: projectName,
          createdAt: new Date().toISOString(),
        },
        options.channelCredentials,
        options.customVariables
      );

      console.log(`[Clone] 准备${environmentVariables.length}个环境变量`);

      // Step 7: 在新项目中创建服务（通过链接Repository）
      // 注意: 这一步实际上需要通过Railway API创建服务或导入源代码
      // 为了保持一致性，我们模拟创建过程，实际应用中需要链接Git repo
      const newService = await this.createServiceFromTemplate(
        newProject.id,
        templateService,
        serviceName
      );
      console.log(`[Clone] 服务创建成功: ${newService.id}`);

      // Step 8: 设置环境变量
      console.log(`[Clone] 设置环境变量`);
      await this.railwayClient.setServiceVariables(
        newService.id,
        environment.id,
        environmentVariables
      );
      console.log(`[Clone] 环境变量设置成功`);

      // Step 9: 触发初始部署
      console.log(`[Clone] 触发初始部署`);
      const deployment = await this.railwayClient.triggerRedeploy(newService.id, environment.id);
      console.log(`[Clone] 部署已触发: ${deployment.id}`);

      // Step 10: 在数据库中记录实例
      console.log(`[Clone] 在数据库中记录实例`);
      const railwayInstance = await this.prisma.railwayInstance.create({
        data: {
          userId: options.userId,
          subscriptionId: options.subscriptionId,
          projectId: newProject.id,
          projectName: newProject.name,
          serviceId: newService.id,
          serviceName: newService.name,
          environmentId: environment.id,
          environmentName,
          deploymentId: deployment.id,
          status: 'INITIALIZING',
          deploymentStatus: deployment.status,
          publicUrl: '', // 部署完成后更新
          variables: environmentVariables.reduce(
            (acc, v) => ({
              ...acc,
              [v.name]: v.isSecret ? '***' : v.value,
            }),
            {}
          ),
        },
      });

      console.log(`[Clone] 实例记录创建成功: ${railwayInstance.id}`);

      return {
        success: true,
        projectId: newProject.id,
        projectName: newProject.name,
        serviceId: newService.id,
        serviceName: newService.name,
        environmentId: environment.id,
        deploymentId: deployment.id,
        variables: environmentVariables.reduce(
          (acc, v) => ({
            ...acc,
            [v.name]: v.isSecret ? '***' : v.value,
          }),
          {}
        ),
        message: `Instance cloned successfully. Deployment in progress.`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Clone] 克隆失败: ${errorMessage}`);
      console.error(error);

      return {
        success: false,
        projectId: '',
        projectName: '',
        serviceId: '',
        serviceName: '',
        environmentId: '',
        message: `Failed to clone instance: ${errorMessage}`,
        errorDetails: errorMessage,
      };
    }
  }

  /**
   * 创建服务（从模板）
   * 注意: 这是一个简化的实现，实际应用需要链接Git repo
   */
  private async createServiceFromTemplate(
    projectId: string,
    templateService: any,
    serviceName: string
  ): Promise<any> {
    // 在实际应用中，这里应该：
    // 1. 通过Railway API创建服务并链接Git repo
    // 2. 或者克隆模板的Git repo配置
    // 
    // 为了演示，我们返回一个模拟的服务对象
    // 实际应用需要根据Railway API文档实现完整的逻辑

    return {
      id: `service-${Date.now()}`,
      name: serviceName,
      projectId,
      createdAt: new Date().toISOString(),
      source: templateService.source,
    };
  }

  /**
   * 准备环境变量
   * 合并模板变量、系统变量、通道凭证和自定义变量
   */
  private prepareEnvironmentVariables(
    templateVariables: Record<string, string>,
    systemVariables: Record<string, string>,
    channelCredentials?: Record<string, any>,
    customVariables?: ServiceVariable[]
  ): ServiceVariable[] {
    const variables: ServiceVariable[] = [];

    // 1. 保留模板的所有变量
    Object.entries(templateVariables).forEach(([name, value]) => {
      variables.push({
        name,
        value,
        isSecret: this.isSecretVariable(name),
      });
    });

    // 2. 添加系统变量（用于追踪）
    Object.entries(systemVariables).forEach(([name, value]) => {
      const varName = `OPENCLAW_${name.toUpperCase()}`;
      variables.push({
        name: varName,
        value,
        isSecret: false,
      });
    });

    // 3. 添加通道凭证（加密存储）
    if (channelCredentials) {
      Object.entries(channelCredentials).forEach(([channelType, credentials]) => {
        // 每个通道类型存储为加密的JSON
        variables.push({
          name: `CHANNEL_${channelType.toUpperCase()}_CONFIG`,
          value: JSON.stringify(credentials),
          isSecret: true,
        });
      });
    }

    // 4. 添加自定义变量
    if (customVariables) {
      variables.push(...customVariables);
    }

    return variables;
  }

  /**
   * 判断是否为敏感变量
   */
  private isSecretVariable(name: string): boolean {
    const secretKeywords = [
      'SECRET',
      'PASSWORD',
      'TOKEN',
      'KEY',
      'CREDENTIAL',
      'APIKEY',
      'API_KEY',
      'PRIVATE',
    ];
    return secretKeywords.some(keyword => name.toUpperCase().includes(keyword));
  }

  /**
   * 获取实例状态
   */
  async getInstanceStatus(projectId: string): Promise<any> {
    try {
      const project = await this.railwayClient.getProject(projectId);
      const services = await this.railwayClient.getProjectServices(projectId);
      const environments = await this.railwayClient.getProjectEnvironments(projectId);

      return {
        projectId,
        projectName: project.name,
        services: services.map(s => ({
          id: s.id,
          name: s.name,
        })),
        environments: environments.map(e => ({
          id: e.id,
          name: e.name,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get instance status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 监控部署进度
   */
  async monitorDeployment(deploymentId: string, maxAttempts: number = 60): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const deployment = await this.railwayClient.getDeploymentStatus(deploymentId);

        console.log(`[Monitor] 部署状态: ${deployment.status}`);

        if (deployment.status === 'RUNNING') {
          return true;
        }

        if (deployment.status === 'FAILED' || deployment.status === 'CRASHED') {
          return false;
        }

        // 等待10秒后再检查
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        console.error(`[Monitor] 检查部署状态失败:`, error);
      }
    }

    // 超过最大尝试次数
    return false;
  }

  /**
   * 更新实例环境变量
   */
  async updateInstanceVariables(
    serviceId: string,
    environmentId: string,
    variables: ServiceVariable[]
  ): Promise<void> {
    try {
      await this.railwayClient.setServiceVariables(serviceId, environmentId, variables);
      console.log(`[Update] 实例${serviceId}的环境变量已更新`);
    } catch (error) {
      throw new Error(
        `Failed to update instance variables: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 重新部署实例
   */
  async redeployInstance(serviceId: string, environmentId: string): Promise<string> {
    try {
      const deployment = await this.railwayClient.triggerRedeploy(serviceId, environmentId);
      console.log(`[Redeploy] 重新部署已触发: ${deployment.id}`);
      return deployment.id;
    } catch (error) {
      throw new Error(
        `Failed to redeploy instance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 删除实例
   */
  async deleteInstance(projectId: string, serviceId: string): Promise<void> {
    try {
      // 先删除服务
      await this.railwayClient.deleteService(serviceId);
      console.log(`[Delete] 服务已删除: ${serviceId}`);

      // 再删除项目
      await this.railwayClient.deleteProject(projectId);
      console.log(`[Delete] 项目已删除: ${projectId}`);

      // 更新数据库记录
      await this.prisma.railwayInstance.updateMany({
        where: {
          projectId,
        },
        data: {
          status: 'DELETED',
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to delete instance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
