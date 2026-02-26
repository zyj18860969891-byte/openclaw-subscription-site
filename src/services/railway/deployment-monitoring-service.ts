/**
 * 部署监控服务
 * 跟踪实例部署进度、健康状态和性能指标
 */

import { PrismaClient } from '@prisma/client';
import { RailwayClient } from './railway-client';

export interface DeploymentMonitor {
  instanceId: string;
  projectId: string;
  deploymentId: string;
  status: 'INITIALIZING' | 'BUILDING' | 'DEPLOYING' | 'RUNNING' | 'FAILED' | 'CRASHED';
  progress: number; // 0-100
  logs: any[];
  errorMessage?: string;
  estimatedTimeRemaining?: number; // seconds
  lastCheckedAt: Date;
}

export interface InstanceHealth {
  instanceId: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  uptime: number; // seconds
  cpuUsage?: number; // percentage
  memoryUsage?: number; // percentage
  responseTime?: number; // ms
  errorRate?: number; // percentage
  lastCheckedAt: Date;
}

export class DeploymentMonitoringService {
  private prisma: PrismaClient;
  private railwayClient: RailwayClient;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(prisma: PrismaClient, railwayClient: RailwayClient) {
    this.prisma = prisma;
    this.railwayClient = railwayClient;
  }

  /**
   * 启动对实例的监控
   */
  async startMonitoring(instanceId: string, checkIntervalSeconds: number = 30): Promise<void> {
    // 清理旧的监控
    if (this.monitoringIntervals.has(instanceId)) {
      clearInterval(this.monitoringIntervals.get(instanceId)!);
    }

    console.log(`[Monitoring] 启动监控: ${instanceId} (间隔: ${checkIntervalSeconds}秒)`);

    // 执行首次检查
    await this.checkDeploymentStatus(instanceId);

    // 设置定期检查
    const interval = setInterval(() => {
      this.checkDeploymentStatus(instanceId).catch(error => {
        console.error(`[Monitoring] 检查失败 ${instanceId}:`, error);
      });
    }, checkIntervalSeconds * 1000);

    this.monitoringIntervals.set(instanceId, interval);
  }

  /**
   * 停止监控
   */
  stopMonitoring(instanceId: string): void {
    const interval = this.monitoringIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(instanceId);
      console.log(`[Monitoring] 已停止监控: ${instanceId}`);
    }
  }

  /**
   * 检查部署状态
   */
  private async checkDeploymentStatus(instanceId: string): Promise<void> {
    try {
      const instance = await this.prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || !instance.deploymentId) {
        console.log(`[Monitoring] 实例不存在或没有部署: ${instanceId}`);
        return;
      }

      const deployment = await this.railwayClient.getDeploymentStatus(instance.deploymentId);

      console.log(`[Monitoring] 部署状态: ${instance.deploymentId} -> ${deployment.status}`);

      // 更新实例的部署状态
      await this.prisma.railwayInstance.update({
        where: { id: instanceId },
        data: {
          deploymentStatus: deployment.status,
          deploymentUpdatedAt: new Date(),
        },
      });

      // 如果部署完成，更新实例状态
      if (deployment.status === 'RUNNING') {
        await this.prisma.railwayInstance.update({
          where: { id: instanceId },
          data: {
            status: 'RUNNING',
            deploymentCompletedAt: new Date(),
          },
        });

        this.stopMonitoring(instanceId);
        console.log(`[Monitoring] 部署完成: ${instanceId}`);
      }

      // 如果部署失败，记录错误
      if (deployment.status === 'FAILED' || deployment.status === 'CRASHED') {
        await this.prisma.railwayInstance.update({
          where: { id: instanceId },
          data: {
            status: 'FAILED',
            errorMessage: `Deployment ${deployment.status}`,
          },
        });

        this.stopMonitoring(instanceId);
        console.error(`[Monitoring] 部署失败: ${instanceId}`);
      }
    } catch (error) {
      console.error(`[Monitoring] 检查状态出错:`, error);
    }
  }

  /**
   * 获取监控数据
   */
  async getMonitoringData(instanceId: string): Promise<DeploymentMonitor | null> {
    try {
      const instance = await this.prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        return null;
      }

      // 计算进度
      const progress = this.calculateProgress(instance.deploymentStatus || 'INITIALIZING');

      // 计算估计剩余时间
      const estimatedTimeRemaining = this.estimateRemainingTime(
        instance.deploymentStatus || 'INITIALIZING'
      );

      return {
        instanceId,
        projectId: instance.projectId,
        deploymentId: instance.deploymentId || '',
        status: (instance.deploymentStatus as any) || 'INITIALIZING',
        progress,
        logs: Array.isArray(instance.logs) ? instance.logs : [],
        errorMessage: instance.errorMessage || undefined,
        estimatedTimeRemaining,
        lastCheckedAt: instance.deploymentUpdatedAt || new Date(),
      };
    } catch (error) {
      console.error(`[Monitoring] 获取监控数据失败:`, error);
      return null;
    }
  }

  /**
   * 计算部署进度
   */
  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      INITIALIZING: 10,
      BUILDING: 30,
      DEPLOYING: 70,
      RUNNING: 100,
      FAILED: 0,
      CRASHED: 0,
    };
    return progressMap[status] || 0;
  }

  /**
   * 估计剩余时间
   */
  private estimateRemainingTime(status: string): number | undefined {
    const timeEstimates: Record<string, number> = {
      INITIALIZING: 60,
      BUILDING: 180,
      DEPLOYING: 120,
      RUNNING: 0,
    };
    return timeEstimates[status];
  }

  /**
   * 获取实例健康状态
   */
  async getInstanceHealth(instanceId: string): Promise<InstanceHealth | null> {
    try {
      const instance = await this.prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        return null;
      }

      // 根据部署状态和其他指标判断健康状态
      let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN' = 'UNKNOWN';

      if (instance.status === 'RUNNING') {
        status = 'HEALTHY';
      } else if (instance.status === 'INITIALIZING' || instance.status === 'DEPLOYING') {
        status = 'DEGRADED';
      } else if (instance.status === 'FAILED') {
        status = 'UNHEALTHY';
      }

      const uptime = instance.deploymentCompletedAt
        ? Math.floor((Date.now() - instance.deploymentCompletedAt.getTime()) / 1000)
        : 0;

      return {
        instanceId,
        status,
        uptime,
        lastCheckedAt: new Date(),
      };
    } catch (error) {
      console.error(`[Monitoring] 获取健康状态失败:`, error);
      return null;
    }
  }

  /**
   * 批量监控多个实例
   */
  async startBatchMonitoring(userIds: string[], checkIntervalSeconds: number = 30): Promise<void> {
    const instances = await this.prisma.railwayInstance.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ['INITIALIZING', 'DEPLOYING'] },
      },
    });

    console.log(`[Monitoring] 启动${instances.length}个实例的批量监控`);

    for (const instance of instances) {
      await this.startMonitoring(instance.id, checkIntervalSeconds);
    }
  }

  /**
   * 停止所有监控
   */
  stopAllMonitoring(): void {
    this.monitoringIntervals.forEach((interval, instanceId) => {
      clearInterval(interval);
      console.log(`[Monitoring] 已停止监控: ${instanceId}`);
    });
    this.monitoringIntervals.clear();
  }

  /**
   * 获取所有正在监控的实例
   */
  getMonitoredInstances(): string[] {
    return Array.from(this.monitoringIntervals.keys());
  }

  /**
   * 记录部署日志
   */
  async addDeploymentLog(instanceId: string, logEntry: string): Promise<void> {
    try {
      const instance = await this.prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        return;
      }

      const currentLogs = Array.isArray(instance.logs) ? instance.logs : [];
      const timestamp = new Date().toISOString();
      const newLog = `[${timestamp}] ${logEntry}`;

      // 保持最后1000条日志
      const updatedLogs = [newLog, ...currentLogs].slice(0, 1000);

      await this.prisma.railwayInstance.update({
        where: { id: instanceId },
        data: {
          logs: updatedLogs,
        },
      });
    } catch (error) {
      console.error(`[Monitoring] 记录日志失败:`, error);
    }
  }

  /**
   * 获取部署日志
   */
  async getDeploymentLogs(instanceId: string, limit: number = 100): Promise<string[]> {
    try {
      const instance = await this.prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || !instance.logs) {
        return [];
      }

      const logs = Array.isArray(instance.logs) ? instance.logs : [];
      return logs.slice(0, limit) as any[];
    } catch (error) {
      console.error(`[Monitoring] 获取日志失败:`, error);
      return [];
    }
  }
}
