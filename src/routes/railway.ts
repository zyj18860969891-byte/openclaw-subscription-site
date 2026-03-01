/**
 * Railway 实例管理路由
 * 简化版本，用于演示
 */

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 简单的内存缓存（生产环境建议使用Redis）
const instanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 缓存30秒

/**
 * POST /api/railway/instances
 * 创建新的Railway实例
 */
router.post(
  '/instances',
  authMiddleware,
  [
    body('instanceName').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('channelCredentials').optional().isObject(),
    body('customVariables').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // 获取用户的当前订阅
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!subscription) {
        res.status(402).json({
          success: false,
          message: 'No active subscription found',
        });
        return;
      }

      // 检查实例数量限制
      const existingInstances = await prisma.railwayInstance.count({
        where: {
          userId,
          status: { not: 'DELETED' },
        },
      });

      const limits: Record<string, number> = {
        BASIC: 1,
        PRO: 5,
        ENTERPRISE: -1, // unlimited
      };

      const limit = limits[subscription.planType];
      if (limit !== -1 && existingInstances >= limit) {
        res.status(403).json({
          success: false,
          message: `Instance limit reached for ${subscription.planType} plan (max: ${limit})`,
        });
        return;
      }

      // 创建实例记录
      const instance = await prisma.railwayInstance.create({
        data: {
          id: `instance_${Date.now()}`,
          subscriptionId: subscription.id,
          userId,
          projectId: `project_${Date.now()}`,
          projectName: req.body.instanceName || 'New Instance',
          serviceId: `service_${Date.now()}`,
          serviceName: 'Default Service',
          environmentId: `env_${Date.now()}`,
          environmentName: 'production',
          status: 'INITIALIZING',
          deploymentStatus: 'INITIALIZING',
          variables: {},
          logs: [],
        },
      });

      res.status(201).json({
        success: true,
        message: 'Instance created successfully',
        data: instance,
      });
    } catch (error) {
      console.error('Error creating instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create instance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/railway/instances
 * 获取用户的所有实例
 */
router.get('/instances', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [Railway] 开始获取实例列表');
    // 从JWT token payload中获取userId（注意：payload中字段名为userId，不是id）
    const userId = (req as any).user?.userId;
    console.log('🔍 [Railway] 用户ID:', userId);
    
    if (!userId) {
      console.log('❌ [Railway] 用户未认证');
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    console.log('🔍 [Railway] 开始数据库查询');
    const startTime = Date.now();
    
    // 检查缓存
    const cacheKey = `railway_instances:${userId}`;
    const cached = instanceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ [Railway] 使用缓存数据，耗时: 0ms');
      return res.json({
        success: true,
        data: cached.data,
        count: cached.data.length,
        cached: true,
      });
    }

    console.log('🔍 [Railway] 缓存未命中，开始数据库查询');
    
    // 设置查询超时（15秒）
    const queryPromise = prisma.railwayInstance.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        projectId: true,
        projectName: true,
        serviceName: true,
        status: true,
        deploymentStatus: true,
        publicUrl: true,
        createdAt: true,
        deploymentCompletedAt: true,
        errorMessage: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // 限制返回数量
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 15000);
    });

    const instances = await Promise.race([queryPromise, timeoutPromise]) as any;

    const queryTime = Date.now() - startTime;
    console.log(`✅ [Railway] 数据库查询完成，耗时: ${queryTime}ms，找到 ${instances.length} 个实例`);

    // 更新缓存
    instanceCache.set(cacheKey, {
      data: instances,
      timestamp: Date.now(),
    });

    // 如果查询太慢，记录警告
    if (queryTime > 1000) {
      console.warn(`⚠️ [Railway] 查询耗时过长 (${queryTime}ms)，请检查数据库索引和连接`);
    }

    return res.json({
      success: true,
      data: instances,
      count: instances.length,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error fetching instances:', error);
    
    // 如果是超时错误，尝试返回缓存（即使过期）
    if (error.message === 'Database query timeout') {
      const cacheKey = `railway_instances:${(req as any).user?.userId}`;
      const cached = instanceCache.get(cacheKey);
      if (cached) {
        console.warn('⚠️ [Railway] 查询超时，返回过期缓存数据');
        return res.json({
          success: true,
          data: cached.data,
          count: cached.data.length,
          cached: true,
          warning: 'Data may be slightly outdated due to slow database',
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch instances',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/railway/instances/:instanceId
 * 获取特定实例的详细信息
 */
router.get(
  '/instances/:instanceId',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { instanceId } = req.params;

      const instance = await prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || instance.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Instance not found',
        });
        return;
      }

      res.json({
        success: true,
        data: instance,
      });
    } catch (error) {
      console.error('Error fetching instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch instance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PUT /api/railway/instances/:instanceId
 * 更新实例信息
 */
router.put(
  '/instances/:instanceId',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { instanceId } = req.params;
      const { status, variables } = req.body;

      const instance = await prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || instance.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Instance not found',
        });
        return;
      }

      const updatedInstance = await prisma.railwayInstance.update({
        where: { id: instanceId },
        data: {
          status: status || instance.status,
          variables: variables || instance.variables,

          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Instance updated successfully',
        data: updatedInstance,
      });
    } catch (error) {
      console.error('Error updating instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update instance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/railway/instances/:instanceId
 * 删除实例
 */
router.delete(
  '/instances/:instanceId',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { instanceId } = req.params;

      const instance = await prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || instance.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Instance not found',
        });
        return;
      }

      await prisma.railwayInstance.update({
        where: { id: instanceId },
        data: {
          status: 'DELETED',
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Instance deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete instance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/railway/instances/:instanceId/deploy
 * 触发部署
 */
router.post(
  '/instances/:instanceId/deploy',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { instanceId } = req.params;

      const instance = await prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || instance.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Instance not found',
        });
        return;
      }

      // 更新实例状态为部署中
      await prisma.railwayInstance.update({
        where: { id: instanceId },
        data: {
          status: 'DEPLOYING',
          deploymentStatus: 'DEPLOYING',
          deploymentUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Deployment triggered successfully',
        data: {
          instanceId,
          status: 'DEPLOYING',
        },
      });
    } catch (error) {
      console.error('Error triggering deployment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger deployment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/railway/instances/:instanceId/status
 * 获取部署状态
 */
router.get(
  '/instances/:instanceId/status',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { instanceId } = req.params;

      const instance = await prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || instance.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Instance not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          instanceId,
          status: instance.status,
          deploymentStatus: instance.deploymentStatus,
          publicUrl: instance.publicUrl,
          errorMessage: instance.errorMessage,
          lastUpdated: instance.updatedAt,
        },
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
 * POST /api/railway/instances/:instanceId/stop
 * 停止实例
 */
router.post(
  '/instances/:instanceId/stop',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { instanceId } = req.params;

      const instance = await prisma.railwayInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || instance.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Instance not found',
        });
        return;
      }

      await prisma.railwayInstance.update({
        where: { id: instanceId },
        data: {
          status: 'STOPPED',
          deploymentStatus: 'STOPPED',
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Instance stopped successfully',
        data: {
          instanceId,
          status: 'STOPPED',
        },
      });
    } catch (error) {
      console.error('Error stopping instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop instance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
