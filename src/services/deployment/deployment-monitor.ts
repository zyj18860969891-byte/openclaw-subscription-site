import { railwayClient } from './railway-client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 定义DeploymentStatus类型
export enum DeploymentStatus {
  PENDING = 'pending',
  CREATING = 'creating',
  CONFIGURING = 'configuring',
  DEPLOYING = 'deploying',
  RUNNING = 'running',
  FAILED = 'failed',
  STOPPED = 'stopped',
}

/**
 * 部署监控配置
 */
interface MonitorConfig {
  checkIntervalMs: number; // 检查间隔（毫秒）
  maxCheckAttempts: number; // 最大检查次数
  alertThresholdMs: number; // 告警阈值（毫秒）
  notificationEnabled: boolean;
}

/**
 * 部署监控结果
 */
interface MonitorResult {
  status: DeploymentStatus;
  serviceUrl?: string;
  error?: string;
  deploymentTime: number;
  lastChecked: Date;
  needsAttention: boolean;
}

/**
 * 部署监控服务
 * 负责持续监控 Railway 实例的部署状态和运行状态
 */
export class DeploymentMonitor {
  private config: MonitorConfig;
  private isMonitoring: boolean = false;
  private monitorInterval?: NodeJS.Timeout;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      checkIntervalMs: config.checkIntervalMs || 30000, // 30秒
      maxCheckAttempts: config.maxCheckAttempts || 10,
      alertThresholdMs: config.alertThresholdMs || 300000, // 5分钟
      notificationEnabled: config.notificationEnabled !== false,
    };
  }

  /**
   * 开始监控所有部署中的实例
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Deployment monitor is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting deployment monitor...');

    // 立即执行一次检查
    await this.checkAllDeployments();

    // 设置定时检查
    this.monitorInterval = setInterval(
      () => this.checkAllDeployments(),
      this.config.checkIntervalMs
    );
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('Deployment monitor stopped');
  }

  /**
   * 检查所有部署中的实例
   */
  private async checkAllDeployments(): Promise<void> {
    try {
      // 获取所有部署中的实例
      const pendingInstances = await prisma.railwayInstance.findMany({
        where: {
          status: {
            in: ['INITIALIZING', 'DEPLOYING'],
          },
        },
        include: {
          subscription: {
            include: {
              user: true,
            },
          },
        },
      });

      console.log(`Checking ${pendingInstances.length} pending deployments...`);

      for (const instance of pendingInstances) {
        await this.checkDeployment(instance);
      }

    } catch (error) {
      console.error('Error checking deployments:', error);
    }
  }

  /**
   * 检查单个部署实例
   */
  private async checkDeployment(instance: any): Promise<void> {
    let needsAttention = false;

    try {
      // 从 Railway API 获取最新状态
      const service = await railwayClient.getService(instance.railwayServiceId);
      
      // 更新本地数据库状态
      const updatedStatus = this.mapRailwayStatus(service.status);
      
      // 检查是否需要告警
      const deploymentDuration = Date.now() - instance.createdAt.getTime();
      if (deploymentDuration > this.config.alertThresholdMs) {
        needsAttention = true;
        console.warn(`Deployment ${instance.id} taking too long: ${deploymentDuration}ms`);
      }

      // 更新数据库
      await prisma.railwayInstance.update({
        where: { id: instance.id },
        data: {
          status: updatedStatus,
          publicUrl: service.publicDomain || instance.publicUrl,
          updatedAt: new Date(),
        },
      });

      // 处理状态变化
      if (updatedStatus === 'running' && instance.status !== 'running') {
        console.log(`Deployment ${instance.id} completed successfully: ${service.publicDomain}`);
        
        // 发送成功通知
        if (this.config.notificationEnabled) {
          await this.sendDeploymentSuccessNotification(instance, service.publicDomain!);
        }

        // 更新订阅状态
        await prisma.subscription.update({
          where: { id: instance.subscriptionId },
          data: {
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        });

      } else if (updatedStatus === 'failed' && instance.status !== 'failed') {
        console.error(`Deployment ${instance.id} failed`);
        
        // 发送失败通知
        if (this.config.notificationEnabled) {
          await this.sendDeploymentFailureNotification(instance);
        }

        // 更新订阅状态
        await prisma.subscription.update({
          where: { id: instance.subscriptionId },
          data: {
            status: 'FAILED' as any,
            updatedAt: new Date(),
          },
        });
      }

      // 记录监控日志
      await this.logMonitoringCheck(instance.id, updatedStatus, service.publicDomain, needsAttention);

    } catch (error) {
      console.error(`Error checking deployment ${instance.id}:`, error);
      
      // 记录错误
      await this.logMonitoringCheck(
        instance.id,
        'error',
        undefined,
        true,
        error instanceof Error ? error.message : 'Unknown error'
      );

      needsAttention = true;
    }

    // 如果需要关注，发送告警
    if (needsAttention && this.config.notificationEnabled) {
      await this.sendAttentionAlert(instance);
    }
  }

  /**
   * 映射 Railway 状态到本地状态
   */
  private mapRailwayStatus(railwayStatus: string): DeploymentStatus {
    switch (railwayStatus) {
      case 'running':
        return DeploymentStatus.RUNNING;
      case 'creating':
      case 'pending':
        return DeploymentStatus.CREATING;
      case 'stopped':
        return DeploymentStatus.FAILED;
      case 'failed':
        return DeploymentStatus.FAILED;
      default:
        return DeploymentStatus.PENDING;
    }
  }

  /**
   * 发送部署成功通知
   */
  private async sendDeploymentSuccessNotification(instance: any, serviceUrl: string): Promise<void> {
    try {
      // 这里可以集成邮件、短信、Slack、钉钉等通知服务
      console.log(`🎉 Deployment success notification for user ${instance.subscription.user.email}`);
      console.log(`Service URL: ${serviceUrl}`);
      
      // 示例：发送邮件通知
      // await emailService.send({
      //   to: instance.subscription.user.email,
      //   subject: '您的 OpenClaw 实例已部署成功',
      //   text: `您的实例已成功部署并运行在: ${serviceUrl}`,
      // });

    } catch (error) {
      console.error('Failed to send deployment success notification:', error);
    }
  }

  /**
   * 发送部署失败通知
   */
  private async sendDeploymentFailureNotification(instance: any): Promise<void> {
    try {
      console.error(`❌ Deployment failure notification for user ${instance.subscription.user.email}`);
      
      // 示例：发送邮件通知
      // await emailService.send({
      //   to: instance.subscription.user.email,
      //   subject: '您的 OpenClaw 实例部署失败',
      //   text: '很抱歉，您的实例部署失败了。我们的技术团队会尽快处理。',
      // });

    } catch (error) {
      console.error('Failed to send deployment failure notification:', error);
    }
  }

  /**
   * 发送需要关注告警
   */
  private async sendAttentionAlert(instance: any): Promise<void> {
    try {
      console.warn(`⚠️ Deployment attention alert for user ${instance.subscription.user.email}`);
      
      // 示例：发送到 Slack 或钉钉群
      // await slackService.sendAlert({
      //   message: `部署 ${instance.id} 需要关注`,
      //   user: instance.subscription.user.email,
      //   subscriptionId: instance.subscriptionId,
      // });

    } catch (error) {
      console.error('Failed to send attention alert:', error);
    }
  }

  /**
   * 记录监控检查日志
   */
  private async logMonitoringCheck(
    instanceId: string,
    status: string,
    serviceUrl?: string,
    needsAttention?: boolean,
    error?: string
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO deployment_monitor_logs (
          instance_id, 
          status, 
          service_url, 
          needs_attention, 
          error_message, 
          checked_at
        ) VALUES (
          ${instanceId}, 
          ${status}, 
          ${serviceUrl || null}, 
          ${needsAttention || false}, 
          ${error || null}, 
          ${new Date()}
        )
      `;
    } catch (error) {
      console.error('Failed to log monitoring check:', error);
    }
  }

  /**
   * 获取实例的监控状态
   */
  async getInstanceMonitorStatus(instanceId: string): Promise<MonitorResult | null> {
    try {
    const instance = await prisma.railwayInstance.findUnique({
      where: { id: instanceId },
    });      if (!instance) {
        return null;
      }

      const service = await railwayClient.getService(instance.serviceId);
      const status = this.mapRailwayStatus(service.status);
      
      const deploymentTime = Date.now() - instance.createdAt.getTime();
      const needsAttention = deploymentTime > this.config.alertThresholdMs;

      return {
        status,
        serviceUrl: service.publicDomain,
        deploymentTime,
        lastChecked: new Date(),
        needsAttention,
      };

    } catch (error) {
      console.error(`Failed to get monitor status for instance ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * 获取所有需要关注的实例
   */
  async getInstancesNeedingAttention(): Promise<any[]> {
    try {
      const thresholdTime = new Date(Date.now() - this.config.alertThresholdMs);
      
      return await prisma.railwayInstance.findMany({
        where: {
          status: {
            in: ['INITIALIZING', 'DEPLOYING'],
          },
          createdAt: {
            lt: thresholdTime,
          },
        },
        include: {
          subscription: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

    } catch (error) {
      console.error('Failed to get instances needing attention:', error);
      return [];
    }
  }

  /**
   * 手动触发检查
   */
  async manualCheck(instanceId?: string): Promise<void> {
    if (instanceId) {
      const instance = await prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });
      
      if (instance) {
        await this.checkDeployment(instance);
      }
    } else {
      await this.checkAllDeployments();
    }
  }

  /**
   * 获取监控统计信息
   */
  async getMonitorStats(): Promise<{
    totalInstances: number;
    runningInstances: number;
    failedInstances: number;
    pendingInstances: number;
    instancesNeedingAttention: number;
  }> {
    try {
      const [total, running, failed, pending, needingAttention] = await Promise.all([
        prisma.railwayInstance.count(),
        prisma.railwayInstance.count({ where: { status: 'RUNNING' } }),
        prisma.railwayInstance.count({ where: { status: 'FAILED' } }),
        prisma.railwayInstance.count({ 
          where: { 
            status: { 
              in: ['INITIALIZING', 'DEPLOYING'] 
            } 
          } 
        }),
        prisma.railwayInstance.count({
          where: {
            status: {
              in: ['INITIALIZING', 'DEPLOYING'],
            },
            createdAt: {
              lt: new Date(Date.now() - this.config.alertThresholdMs),
            },
          },
        }),
      ]);

      return {
        totalInstances: total,
        runningInstances: running,
        failedInstances: failed,
        pendingInstances: pending,
        instancesNeedingAttention: needingAttention,
      };

    } catch (error) {
      console.error('Failed to get monitor stats:', error);
      return {
        totalInstances: 0,
        runningInstances: 0,
        failedInstances: 0,
        pendingInstances: 0,
        instancesNeedingAttention: 0,
      };
    }
  }
}

// 导出单例实例
export const deploymentMonitor = new DeploymentMonitor();