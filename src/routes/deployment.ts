import { Router } from 'express';
import { deploymentService } from '../services/deployment/deployment-service';
import { deploymentMonitor } from '../services/deployment/deployment-monitor';
import { authMiddleware } from '../middleware/auth';
import { AppError } from '../utils/errors';
import { prisma } from '../database/prisma';
// import { validateRequest } from '../middleware/validation-middleware';

const router = Router();

/**
 * 获取部署状态
 * GET /api/deployment/status/:subscriptionId
 */
router.get('/status/:subscriptionId', authMiddleware, async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const userId = (req as any).user?.id;

    // 验证用户权限
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    if (subscription.user.id !== userId) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    const status = await deploymentService.getDeploymentStatus(subscriptionId);

    res.json({
      success: true,
      data: status,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 触发新部署
 * POST /api/deployment/trigger
 */
router.post('/trigger', authMiddleware, async (req, res, next) => {
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

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    if (subscription.user.id !== (req as any).user?.id) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    // 检查是否已有活跃的部署
    const existingStatus = await deploymentService.getDeploymentStatus(subscriptionId);
    if (existingStatus.status === 'running') {
      throw new AppError('Instance is already running', 400);
    }

    const result = await deploymentService.deployNewInstance(subscriptionId);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 重试部署
 * POST /api/deployment/retry
 */
router.post('/retry', authMiddleware, async (req, res, next) => {
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

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    if (subscription.user.id !== (req as any).user?.id) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    const result = await deploymentService.retryDeployment(subscriptionId);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 取消部署
 * DELETE /api/deployment/cancel
 */
router.delete('/cancel', authMiddleware, async (req, res, next) => {
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

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    if (subscription.user.id !== (req as any).user?.id) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    await deploymentService.cancelDeployment(subscriptionId);

    res.json({
      success: true,
      message: 'Deployment cancelled successfully',
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 获取部署日志
 * GET /api/deployment/logs/:subscriptionId
 */
router.get('/logs/:subscriptionId', authMiddleware, async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const userId = (req as any).user?.id;

    // 验证用户权限
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    if (subscription.user.id !== userId) {
      throw new AppError('Unauthorized to access this subscription', 403);
    }

    const logs = await deploymentService.getDeploymentLogs(subscriptionId);

    res.json({
      success: true,
      data: {
        logs,
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 获取监控统计信息
 * GET /api/deployment/stats
 */
router.get('/stats', authMiddleware, async (_req, res, next) => {
  try {
    const stats = await deploymentMonitor.getMonitorStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 手动触发部署检查
 * POST /api/deployment/check
 */
router.post('/check', authMiddleware, async (req, res, next) => {
  try {
    const { instanceId } = req.body;

    await deploymentMonitor.manualCheck(instanceId);

    res.json({
      success: true,
      message: 'Deployment check completed',
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 获取需要关注的实例
 * GET /api/deployment/attention
 */
router.get('/attention', authMiddleware, async (_req, res, next) => {
  try {
    const instances = await deploymentMonitor.getInstancesNeedingAttention();

    res.json({
      success: true,
      data: instances,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 开始监控
 * POST /api/deployment/monitor/start
 */
router.post('/monitor/start', authMiddleware, async (_req, res, next) => {
  try {
    await deploymentMonitor.startMonitoring();

    res.json({
      success: true,
      message: 'Deployment monitor started',
    });

  } catch (error) {
    next(error);
  }
});

/**
 * 停止监控
 * POST /api/deployment/monitor/stop
 */
router.post('/monitor/stop', authMiddleware, async (_req, res, next) => {
  try {
    deploymentMonitor.stopMonitoring();

    res.json({
      success: true,
      message: 'Deployment monitor stopped',
    });

  } catch (error) {
    next(error);
  }
});

export default router;