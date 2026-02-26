# 支付与部署集成指南

## 支付流程概述

```
用户选择计划 → 创建支付订单 → 用户支付 → 支付回调 → 激活订阅 → 触发Railway部署 → 监控部署 → 通知用户
```

## 支付回调处理

### 支付宝回调处理

```typescript
// POST /api/payment/alipay/notify
router.post('/alipay/notify', async (req, res) => {
  try {
    // 1. 验证回调签名
    const isValid = await alipayService.verifyCallback(req.body);
    if (!isValid) {
      return res.status(400).send('Invalid signature');
    }

    // 2. 处理支付结果
    const { out_trade_no, trade_status } = req.body;
    
    // 3. 更新支付状态
    await paymentGateway.handleNotify('ALIPAY', req.body);
    
    // 4. 返回成功响应
    res.send('success');
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).send('error');
  }
});
```

### 微信支付回调处理

```typescript
// POST /api/payment/wechat/notify
router.post('/wechat/notify', async (req, res) => {
  try {
    // 1. 验证回调签名
    const isValid = await wechatService.verifyCallback(req.body);
    if (!isValid) {
      return res.status(400).send('Invalid signature');
    }

    // 2. 处理支付结果
    const { out_trade_no, result_code } = req.body;
    
    // 3. 更新支付状态
    await paymentGateway.handleNotify('WECHAT', req.body);
    
    // 4. 返回成功响应
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>');
  } catch (error) {
    console.error('Payment callback error:', error);
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>');
  }
});
```

## 支付成功后的处理流程

### 1. 验证支付结果

```typescript
async function handleSuccessfulPayment(outTradeNo: string): Promise<void> {
  console.log(`[Payment] 处理成功支付: ${outTradeNo}`);
  
  // 1. 获取支付记录
  const payment = await prisma.payment.findUnique({
    where: { orderId: outTradeNo },
    include: {
      subscription: {
        include: {
          channelCredentials: true,
        },
      },
      user: true,
    },
  });

  if (!payment || !payment.subscriptionId) {
    console.error(`[Payment] 支付记录不存在或缺少订阅: ${outTradeNo}`);
    return;
  }

  if (!payment.subscription) {
    console.error(`[Payment] 支付记录缺少订阅关联: ${outTradeNo}`);
    return;
  }

  console.log(`[Payment] 找到订阅: ${payment.subscriptionId}`);
}
```

### 2. 激活订阅

```typescript
// 2. 激活订阅
await prisma.subscription.update({
  where: { id: payment.subscriptionId },
  data: {
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
  },
});
console.log(`[Payment] 订阅已激活`);
```

### 3. 准备通道凭证

```typescript
// 3. 准备通道凭证
const channelCredentials: Record<string, any> = {};
for (const cred of payment.subscription.channelCredentials) {
  channelCredentials[cred.channelType] = cred.credentialsEncrypted;
}
```

### 4. 触发Railway部署

```typescript
// 4. 如果配置了RailwayCloneService，触发部署
if (this.railwayCloneService) {
  console.log(`[Payment] 开始触发Railway部署`);
  
  const cloneResult = await this.railwayCloneService.cloneAndCreateInstance({
    templateProjectId: process.env.RAILWAY_TEMPLATE_PROJECT_ID!,
    templateServiceId: process.env.RAILWAY_TEMPLATE_SERVICE_ID!,
    userId: payment.userId,
    subscriptionId: payment.subscriptionId,
    plan: payment.subscription.planType as 'BASIC' | 'PRO' | 'ENTERPRISE',
    channelCredentials,
  });

  if (cloneResult.success) {
    console.log(`[Payment] Railway部署成功: ${cloneResult.serviceId}`);
    
    // 5. 创建Railway实例记录
    await prisma.railwayInstance.create({
      data: {
        subscriptionId: payment.subscriptionId,
        userId: payment.userId,
        projectId: cloneResult.projectId,
        projectName: cloneResult.projectName,
        serviceId: cloneResult.serviceId,
        serviceName: cloneResult.serviceName,
        environmentId: cloneResult.environmentId,
        status: 'INITIALIZING',
        deploymentStatus: 'INITIALIZING',
        publicUrl: cloneResult.publicUrl || '',
        variables: cloneResult.variables || {},
      },
    });
  } else {
    console.error(`[Payment] Railway部署失败: ${cloneResult.errorDetails}`);
    // 部署失败不影响订阅激活，但需要记录
  }
} else {
  console.log(`[Payment] RailwayCloneService未配置，跳过部署`);
}
```

## 部署状态通知

### 部署成功通知

```typescript
async function notifyDeploymentSuccess(instance: RailwayInstance): Promise<void> {
  // 发送邮件通知
  await emailService.sendDeploymentSuccessEmail({
    to: instance.user.email,
    instanceName: instance.projectName,
    publicUrl: instance.publicUrl,
    deploymentTime: instance.deploymentCompletedAt - instance.createdAt,
  });

  // 发送站内通知
  await notificationService.createNotification({
    userId: instance.userId,
    type: 'DEPLOYMENT_SUCCESS',
    title: '实例部署成功',
    message: `您的实例 ${instance.projectName} 已成功部署`,
    data: {
      instanceId: instance.id,
      publicUrl: instance.publicUrl,
    },
  });
}
```

### 部署失败通知

```typescript
async function notifyDeploymentFailure(instance: RailwayInstance, error: string): Promise<void> {
  // 发送邮件通知
  await emailService.sendDeploymentFailureEmail({
    to: instance.user.email,
    instanceName: instance.projectName,
    error: error,
  });

  // 发送站内通知
  await notificationService.createNotification({
    userId: instance.userId,
    type: 'DEPLOYMENT_FAILED',
    title: '实例部署失败',
    message: `您的实例 ${instance.projectName} 部署失败: ${error}`,
    data: {
      instanceId: instance.id,
      error: error,
    },
  });
}
```

## 部署监控

### 实时部署状态查询

```typescript
// GET /api/deployment/status/:subscriptionId
router.get('/status/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = (req as any).user?.id;

    // 验证用户权限
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription || subscription.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const status = await deploymentService.getDeploymentStatus(subscriptionId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching deployment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployment status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

### 部署进度查询

```typescript
// GET /api/deployment-monitor/progress/:instanceId
router.get('/progress/:instanceId', authMiddleware, async (req, res) => {
  try {
    const { instanceId } = req.params;

    const progress = await deploymentMonitor.getDeploymentProgress(instanceId);

    res.json({
      success: true,
      data: {
        instanceId,
        progress,
        percentage: `${progress}%`,
      },
    });
  } catch (error) {
    console.error('Error fetching deployment progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployment progress',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

## 错误处理和重试

### 部署失败重试

```typescript
// POST /api/deployment/retry
router.post('/retry', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      throw new AppError('Subscription ID is required', 400);
    }

    // 验证用户权限
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription || subscription.userId !== (req as any).user?.id) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    // 检查是否已有活跃的部署
    const existingStatus = await deploymentService.getDeploymentStatus(subscriptionId);
    if (existingStatus.status === 'running') {
      throw new AppError('Instance is already running', 400);
    }

    const result = await deploymentService.retryDeployment(subscriptionId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error retrying deployment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry deployment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

### 部署取消

```typescript
// DELETE /api/deployment/cancel
router.delete('/cancel', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      throw new AppError('Subscription ID is required', 400);
    }

    // 验证用户权限
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription || subscription.userId !== (req as any).user?.id) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    await deploymentService.cancelDeployment(subscriptionId);

    res.json({
      success: true,
      message: 'Deployment cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling deployment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deployment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

## 部署日志

### 获取部署日志

```typescript
// GET /api/deployment/logs/:subscriptionId
router.get('/logs/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = (req as any).user?.id;

    // 验证用户权限
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription || subscription.userId !== userId) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    const logs = await deploymentService.getDeploymentLogs(subscriptionId);

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching deployment logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployment logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

## 监控和告警

### 部署监控统计

```typescript
// GET /api/deployment-monitor/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await deploymentMonitor.getMonitorStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching monitor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

### 需要关注的实例

```typescript
// GET /api/deployment/attention
router.get('/attention', authMiddleware, async (req, res) => {
  try {
    const instances = await deploymentMonitor.getInstancesNeedingAttention();

    res.json({
      success: true,
      data: instances,
    });
  } catch (error) {
    console.error('Error fetching instances needing attention:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instances needing attention',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

## 部署状态管理

### 部署状态枚举

```typescript
enum DeploymentStatus {
  PENDING = 'pending',      // 等待部署
  CREATING = 'creating',    // 创建中
  CONFIGURING = 'configuring', // 配置中
  DEPLOYING = 'deploying',  // 部署中
  RUNNING = 'running',      // 运行中
  FAILED = 'failed',        // 失败
  STOPPED = 'stopped',      // 停止
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

## 部署优化

### 并发部署限制

```typescript
// 限制并发部署数量
const MAX_CONCURRENT_DEPLOYMENTS = 3;
const activeDeployments = new Set<string>();

async function deployWithConcurrencyLimit(subscriptionId: string): Promise<DeploymentResult> {
  if (activeDeployments.size >= MAX_CONCURRENT_DEPLOYMENTS) {
    throw new Error('Maximum concurrent deployments reached');
  }

  activeDeployments.add(subscriptionId);
  try {
    return await deploymentService.deployNewInstance(subscriptionId);
  } finally {
    activeDeployments.delete(subscriptionId);
  }
}
```

### 部署队列

```typescript
// 使用队列处理部署请求
import Queue from 'bull';

const deploymentQueue = new Queue('deployment', process.env.REDIS_URL);

// 添加部署任务到队列
async function queueDeployment(subscriptionId: string): Promise<void> {
  await deploymentQueue.add('deploy', { subscriptionId });
}

// 处理部署任务
deploymentQueue.process('deploy', async (job) => {
  const { subscriptionId } = job.data;
  return await deploymentService.deployNewInstance(subscriptionId);
});
```

## 相关文档

- [Railway自动化部署配置](./RAILWAY_DEPLOYMENT_CONFIG.md)
- [环境变量配置示例](./ENV_VARIABLES_EXAMPLE.md)
- [Phase 3完整实现](./PHASE_3_COMPLETE.md)