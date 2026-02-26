# 部署监控和错误处理

## 部署监控架构

### 监控服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                  DeploymentMonitoringService                 │
├─────────────────────────────────────────────────────────────┤
│  • 启动/停止监控                                             │
│  • 检查部署状态                                              │
│  • 计算部署进度                                              │
│  • 记录部署日志                                              │
│  • 评估实例健康状态                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    RailwayClient (API)                       │
├─────────────────────────────────────────────────────────────┤
│  • 查询部署状态                                              │
│  • 获取部署日志                                              │
│  • 检查服务健康                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Railway.app GraphQL API                   │
├─────────────────────────────────────────────────────────────┤
│  • 部署状态查询                                              │
│  • 部署日志获取                                              │
│  • 服务健康检查                                              │
└─────────────────────────────────────────────────────────────┘
```

## 部署状态监控

### 部署状态枚举

```typescript
enum DeploymentStatus {
  INITIALIZING = 'INITIALIZING',  // 初始化中
  BUILDING = 'BUILDING',          // 构建中
  DEPLOYING = 'DEPLOYING',        // 部署中
  RUNNING = 'RUNNING',            // 运行中
  FAILED = 'FAILED',              // 失败
  CRASHED = 'CRASHED',            // 崩溃
}
```

### 实例状态枚举

```typescript
enum InstanceStatus {
  INITIALIZING = 'INITIALIZING',  // 初始化中
  DEPLOYING = 'DEPLOYING',        // 部署中
  RUNNING = 'RUNNING',            // 运行中
  FAILED = 'FAILED',              // 失败
  DELETED = 'DELETED',            // 已删除
}
```

## 监控服务实现

### 启动监控

```typescript
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
```

### 检查部署状态

```typescript
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
```

### 停止监控

```typescript
stopMonitoring(instanceId: string): void {
  const interval = this.monitoringIntervals.get(instanceId);
  if (interval) {
    clearInterval(interval);
    this.monitoringIntervals.delete(instanceId);
    console.log(`[Monitoring] 已停止监控: ${instanceId}`);
  }
}
```

## 部署进度计算

### 进度计算逻辑

```typescript
async getDeploymentProgress(instanceId: string): Promise<number> {
  try {
    const instance = await this.prisma.railwayInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      return 0;
    }

    // 根据部署状态计算进度
    const statusProgress: Record<string, number> = {
      INITIALIZING: 10,
      BUILDING: 40,
      DEPLOYING: 70,
      RUNNING: 100,
      FAILED: 0,
      CRASHED: 0,
    };

    const progress = statusProgress[instance.deploymentStatus] || 0;

    // 如果部署时间过长，增加进度
    if (instance.deploymentStatus === 'DEPLOYING') {
      const deploymentTime = Date.now() - instance.createdAt.getTime();
      const maxDeploymentTime = 300000; // 5分钟
      const timeProgress = Math.min(deploymentTime / maxDeploymentTime * 30, 30);
      return Math.min(progress + timeProgress, 95);
    }

    return progress;
  } catch (error) {
    console.error(`[Monitoring] 获取部署进度失败:`, error);
    return 0;
  }
}
```

## 部署日志管理

### 获取部署日志

```typescript
async getDeploymentLogs(instanceId: string, limit: number = 100): Promise<string[]> {
  try {
    const instance = await this.prisma.railwayInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || !instance.deploymentId) {
      return [];
    }

    // 从Railway API获取日志
    const logs = await this.railwayClient.getDeploymentLogs(
      instance.serviceId,
      instance.deploymentId
    );

    // 保存到数据库
    await this.prisma.railwayInstance.update({
      where: { id: instanceId },
      data: {
        logs: {
          push: logs.slice(-limit), // 只保留最新的日志
        },
      },
    });

    return logs.slice(-limit);
  } catch (error) {
    console.error(`[Monitoring] 获取部署日志失败:`, error);
    return [];
  }
}
```

### 日志轮转

```typescript
private async rotateLogs(instanceId: string, maxLogs: number = 1000): Promise<void> {
  try {
    const instance = await this.prisma.railwayInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || !instance.logs) {
      return;
    }

    const logs = instance.logs as string[];
    if (logs.length > maxLogs) {
      await this.prisma.railwayInstance.update({
        where: { id: instanceId },
        data: {
          logs: logs.slice(-maxLogs),
        },
      });
    }
  } catch (error) {
    console.error(`[Monitoring] 日志轮转失败:`, error);
  }
}
```

## 健康检查

### 实例健康状态

```typescript
async getInstanceHealth(instanceId: string): Promise<InstanceHealth> {
  try {
    const instance = await this.prisma.railwayInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      return {
        instanceId,
        status: 'UNKNOWN',
        uptime: 0,
        lastCheckedAt: new Date(),
      };
    }

    // 检查部署状态
    if (instance.status === 'FAILED' || instance.status === 'DELETED') {
      return {
        instanceId,
        status: 'UNHEALTHY',
        uptime: 0,
        lastCheckedAt: new Date(),
      };
    }

    // 检查运行时间
    const uptime = Date.now() - instance.createdAt.getTime();
    const maxUptime = 24 * 60 * 60 * 1000; // 24小时

    if (uptime > maxUptime) {
      return {
        instanceId,
        status: 'DEGRADED',
        uptime: Math.floor(uptime / 1000),
        lastCheckedAt: new Date(),
      };
    }

    // 检查部署状态
    if (instance.deploymentStatus === 'RUNNING') {
      return {
        instanceId,
        status: 'HEALTHY',
        uptime: Math.floor(uptime / 1000),
        lastCheckedAt: new Date(),
      };
    }

    return {
      instanceId,
      status: 'DEGRADED',
      uptime: Math.floor(uptime / 1000),
      lastCheckedAt: new Date(),
    };
  } catch (error) {
    console.error(`[Monitoring] 获取实例健康状态失败:`, error);
    return {
      instanceId,
      status: 'UNKNOWN',
      uptime: 0,
      lastCheckedAt: new Date(),
    };
  }
}
```

## 错误处理

### 部署错误分类

```typescript
enum DeploymentErrorType {
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',  // 配置错误
  NETWORK_ERROR = 'NETWORK_ERROR',              // 网络错误
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', // 认证错误
  RESOURCE_ERROR = 'RESOURCE_ERROR',            // 资源错误
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',              // 超时错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',              // 未知错误
}
```

### 错误处理策略

```typescript
async handleDeploymentError(
  instanceId: string,
  error: Error,
  errorType: DeploymentErrorType
): Promise<void> {
  console.error(`[Deployment] 部署错误: ${instanceId}`, error);

  // 记录错误到数据库
  await this.prisma.railwayInstance.update({
    where: { id: instanceId },
    data: {
      status: 'FAILED',
      errorMessage: error.message,
      errorType: errorType,
    },
  });

  // 根据错误类型采取不同措施
  switch (errorType) {
    case DeploymentErrorType.CONFIGURATION_ERROR:
      await this.handleConfigurationError(instanceId, error);
      break;
    case DeploymentErrorType.NETWORK_ERROR:
      await this.handleNetworkError(instanceId, error);
      break;
    case DeploymentErrorType.AUTHENTICATION_ERROR:
      await this.handleAuthenticationError(instanceId, error);
      break;
    case DeploymentErrorType.RESOURCE_ERROR:
      await this.handleResourceError(instanceId, error);
      break;
    case DeploymentErrorType.TIMEOUT_ERROR:
      await this.handleTimeoutError(instanceId, error);
      break;
    default:
      await this.handleUnknownError(instanceId, error);
      break;
  }
}
```

### 配置错误处理

```typescript
private async handleConfigurationError(instanceId: string, error: Error): Promise<void> {
  console.error(`[Error] 配置错误: ${instanceId}`, error);

  // 发送通知给管理员
  await this.sendAdminNotification({
    type: 'CONFIGURATION_ERROR',
    instanceId,
    error: error.message,
    action: '检查环境变量配置',
  });

  // 标记为需要人工干预
  await this.prisma.railwayInstance.update({
    where: { id: instanceId },
    data: {
      needsAttention: true,
      attentionReason: '配置错误',
    },
  });
}
```

### 网络错误处理

```typescript
private async handleNetworkError(instanceId: string, error: Error): Promise<void> {
  console.error(`[Error] 网络错误: ${instanceId}`, error);

  // 尝试重试
  const retryCount = await this.getRetryCount(instanceId);
  if (retryCount < 3) {
    console.log(`[Error] 尝试重试部署: ${instanceId} (第${retryCount + 1}次)`);
    await this.incrementRetryCount(instanceId);
    await this.retryDeployment(instanceId);
  } else {
    // 超过最大重试次数
    await this.sendAdminNotification({
      type: 'NETWORK_ERROR_MAX_RETRIES',
      instanceId,
      error: error.message,
      action: '检查网络连接和Railway API状态',
    });
  }
}
```

### 认证错误处理

```typescript
private async handleAuthenticationError(instanceId: string, error: Error): Promise<void> {
  console.error(`[Error] 认证错误: ${instanceId}`, error);

  // 检查API Token是否有效
  const isValid = await this.validateRailwayToken();
  if (!isValid) {
    await this.sendAdminNotification({
      type: 'AUTHENTICATION_ERROR',
      instanceId,
      error: error.message,
      action: '更新Railway API Token',
    });
  }
}
```

### 资源错误处理

```typescript
private async handleResourceError(instanceId: string, error: Error): Promise<void> {
  console.error(`[Error] 资源错误: ${instanceId}`, error);

  // 检查资源配额
  const resourceUsage = await this.getResourceUsage();
  if (resourceUsage.exceeded) {
    await this.sendAdminNotification({
      type: 'RESOURCE_QUOTA_EXCEEDED',
      instanceId,
      error: error.message,
      action: '清理旧实例或升级计划',
    });
  }
}
```

### 超时错误处理

```typescript
private async handleTimeoutError(instanceId: string, error: Error): Promise<void> {
  console.error(`[Error] 超时错误: ${instanceId}`, error);

  // 检查部署时间
  const instance = await this.prisma.railwayInstance.findUnique({
    where: { id: instanceId },
  });

  if (instance) {
    const deploymentTime = Date.now() - instance.createdAt.getTime();
    const maxDeploymentTime = 10 * 60 * 1000; // 10分钟

    if (deploymentTime > maxDeploymentTime) {
      await this.sendAdminNotification({
        type: 'DEPLOYMENT_TIMEOUT',
        instanceId,
        error: error.message,
        action: '检查部署配置和资源限制',
      });
    }
  }
}
```

### 未知错误处理

```typescript
private async handleUnknownError(instanceId: string, error: Error): Promise<void> {
  console.error(`[Error] 未知错误: ${instanceId}`, error);

  // 记录详细错误信息
  await this.prisma.railwayInstance.update({
    where: { id: instanceId },
    data: {
      errorMessage: `Unknown error: ${error.message}`,
      errorStack: error.stack,
    },
  });

  // 发送通知给管理员
  await this.sendAdminNotification({
    type: 'UNKNOWN_ERROR',
    instanceId,
    error: error.message,
    action: '检查应用日志和系统状态',
  });
}
```

## 重试机制

### 重试配置

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // 毫秒
  maxDelay: number; // 毫秒
  backoffFactor: number;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};
```

### 指数退避重试

```typescript
async retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxAttempts) {
        break;
      }

      // 计算延迟时间
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      console.log(`[Retry] 第${attempt}次尝试失败，${delay}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retry attempts exceeded');
}
```

## 监控和告警

### 监控统计

```typescript
async getMonitorStats(): Promise<MonitorStats> {
  try {
    const instances = await this.prisma.railwayInstance.findMany({
      where: {
        deletedAt: null,
      },
    });

    const stats: MonitorStats = {
      totalInstances: instances.length,
      runningInstances: instances.filter(i => i.status === 'RUNNING').length,
      failedInstances: instances.filter(i => i.status === 'FAILED').length,
      pendingInstances: instances.filter(i => i.status === 'INITIALIZING').length,
      avgDeploymentTime: this.calculateAvgDeploymentTime(instances),
      errorRate: this.calculateErrorRate(instances),
    };

    return stats;
  } catch (error) {
    console.error(`[Monitoring] 获取监控统计失败:`, error);
    return {
      totalInstances: 0,
      runningInstances: 0,
      failedInstances: 0,
      pendingInstances: 0,
      avgDeploymentTime: 0,
      errorRate: 0,
    };
  }
}
```

### 需要关注的实例

```typescript
async getInstancesNeedingAttention(): Promise<any[]> {
  try {
    const thresholdTime = new Date(Date.now() - this.config.alertThresholdMs);
    
    return await this.prisma.railwayInstance.findMany({
      where: {
        status: {
          in: ['INITIALIZING', 'DEPLOYING'],
        },
        createdAt: {
          lt: thresholdTime,
        },
      },
      include: {
        user: true,
        subscription: true,
      },
    });
  } catch (error) {
    console.error(`[Monitoring] 获取需要关注的实例失败:`, error);
    return [];
  }
}
```

### 告警通知

```typescript
async sendDeploymentFailureNotification(instance: any): Promise<void> {
  try {
    // 发送邮件通知
    await emailService.sendDeploymentFailureEmail({
      to: instance.user.email,
      instanceName: instance.projectName,
      error: instance.errorMessage,
      deploymentTime: instance.deploymentCompletedAt - instance.createdAt,
    });

    // 发送站内通知
    await notificationService.createNotification({
      userId: instance.userId,
      type: 'DEPLOYMENT_FAILED',
      title: '实例部署失败',
      message: `您的实例 ${instance.projectName} 部署失败: ${instance.errorMessage}`,
      data: {
        instanceId: instance.id,
        error: instance.errorMessage,
      },
    });

    // 发送Webhook通知（如果配置）
    if (this.config.webhookUrl) {
      await this.sendWebhookNotification({
        type: 'DEPLOYMENT_FAILED',
        instance: {
          id: instance.id,
          name: instance.projectName,
          userId: instance.userId,
          error: instance.errorMessage,
        },
      });
    }
  } catch (error) {
    console.error(`[Monitoring] 发送告警通知失败:`, error);
  }
}
```

## 性能优化

### 监控间隔优化

```typescript
// 根据部署状态调整监控间隔
function getCheckInterval(deploymentStatus: string): number {
  const intervals: Record<string, number> = {
    INITIALIZING: 10000,  // 10秒
    BUILDING: 15000,      // 15秒
    DEPLOYING: 10000,     // 10秒
    RUNNING: 60000,       // 60秒
    FAILED: 30000,        // 30秒
    CRASHED: 30000,       // 30秒
  };

  return intervals[deploymentStatus] || 30000;
}
```

### 批量检查优化

```typescript
async batchCheckDeployments(instanceIds: string[]): Promise<void> {
  const batchSize = 5;
  const batches = [];

  for (let i = 0; i < instanceIds.length; i += batchSize) {
    batches.push(instanceIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(instanceId => this.checkDeploymentStatus(instanceId))
    );
    
    // 批次间延迟，避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

## 相关文档

- [Railway自动化部署配置](./RAILWAY_DEPLOYMENT_CONFIG.md)
- [支付与部署集成](./PAYMENT_DEPLOYMENT_INTEGRATION.md)
- [Phase 3完整实现](./PHASE_3_COMPLETE.md)