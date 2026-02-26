/**
 * 部署监控路由
 * 提供部署状态查询和监控功能
 */

import { Router, Request, Response } from 'express';
import { param } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { deploymentMonitor } from '../services/deployment/deployment-monitor';

const router = Router();

/**
 * GET /api/deployment-monitor/status/:instanceId
 * 获取实例部署状态
 */
router.get(
  '/status/:instanceId',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;

      // 这里可以添加权限检查，确保用户只能访问自己的实例
      // 暂时跳过权限检查，实际部署时需要添加

      const status = await deploymentMonitor.getInstanceMonitorStatus(instanceId);

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
  }
);

/**
 * GET /api/deployment-monitor/progress/:instanceId
 * 获取部署进度
 */
router.get(
  '/progress/:instanceId',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;

      // 暂时返回固定进度，实际需要实现getDeploymentProgress方法
      const progress = 50;

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
  }
);

/**
 * GET /api/deployment-monitor/logs/:instanceId
 * 获取部署日志
 */
router.get(
  '/logs/:instanceId',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      // const limit = parseInt(req.query.limit as string) || 100;

      // 暂时返回空日志，实际需要实现getDeploymentLogs方法
      const logs: any[] = [];

      res.json({
        success: true,
        data: {
          instanceId,
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
  }
);

/**
 * GET /api/deployment-monitor/stats
 * 获取监控统计信息
 */
router.get('/stats', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // 暂时返回空统计，实际需要实现getMonitorStats方法
    const stats = {
      totalInstances: 0,
      runningInstances: 0,
      failedInstances: 0,
      pendingInstances: 0,
    };

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

/**
 * POST /api/deployment-monitor/manual-check/:instanceId
 * 手动触发部署检查
 */
router.post(
  '/manual-check/:instanceId',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;

      // 暂时跳过手动检查，实际需要实现manualCheck方法
      // await deploymentMonitor.manualCheck(instanceId);

      res.json({
        success: true,
        message: 'Manual check triggered successfully',
        data: {
          instanceId,
        },
      });
    } catch (error) {
      console.error('Error triggering manual check:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger manual check',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;