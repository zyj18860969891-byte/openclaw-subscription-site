/**
 * Railway 自动化部署路由
 * 集成完整的Railway克隆服务
 */

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { RailwayClient } from '../services/railway/railway-client';
import { RailwayCloneService } from '../services/railway/railway-clone-service';
import { EnvironmentVariableService } from '../services/railway/environment-variable-service';
import { DeploymentMonitoringService } from '../services/railway/deployment-monitoring-service';

const router = Router();
const prisma = new PrismaClient();

// 初始化Railway服务
function initializeRailwayServices() {
  const apiToken = process.env.RAILWAY_API_TOKEN;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!apiToken || !encryptionKey) {
    throw new Error('Missing required environment variables: RAILWAY_API_TOKEN, ENCRYPTION_KEY');
  }

  const railwayClient = new RailwayClient(apiToken);
  const cloneService = new RailwayCloneService(railwayClient, prisma);
  const envService = new EnvironmentVariableService(prisma, encryptionKey);
  const monitoringService = new DeploymentMonitoringService(prisma, railwayClient);

  return { railwayClient, cloneService, envService, monitoringService };
}

/**
 * POST /api/railway/deploy
 * 创建并部署新的Railway实例
 */
router.post(
  '/deploy',
  authMiddleware,
  [
    body('instanceName').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('channelCredentials').optional().isObject(),
    body('customVariables').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
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
        include: {
          channelCredentials: true,
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

      // 检查环境变量
      if (!process.env.RAILWAY_TEMPLATE_PROJECT_ID || !process.env.RAILWAY_TEMPLATE_SERVICE_ID) {
        res.status(500).json({
          success: false,
          message: 'Railway template configuration not found',
        });
        return;
      }

      // 初始化Railway服务
      const { cloneService, monitoringService } = initializeRailwayServices();

      // 准备通道凭证
      const channelCredentials: Record<string, any> = {};
      for (const cred of subscription.channelCredentials) {
        channelCredentials[cred.channelType] = cred.credentialsEncrypted;
      }

      // 克隆并创建实例
      const cloneResult = await cloneService.cloneAndCreateInstance({
        templateProjectId: process.env.RAILWAY_TEMPLATE_PROJECT_ID!,
        templateServiceId: process.env.RAILWAY_TEMPLATE_SERVICE_ID!,
        userId,
        subscriptionId: subscription.id,
        plan: subscription.planType as 'BASIC' | 'PRO' | 'ENTERPRISE',
        instanceName: req.body.instanceName,
        channelCredentials,
        customVariables: req.body.customVariables || [],
      });

      if (!cloneResult.success) {
        res.status(500).json({
          success: false,
          message: 'Failed to create Railway instance',
          error: cloneResult.errorDetails,
        });
        return;
      }

      // 启动监控
      if (cloneResult.deploymentId) {
        await monitoringService.startMonitoring(cloneResult.projectId, 30);
      }

      res.status(201).json({
        success: true,
        message: 'Railway instance created and deployment started',
        data: {
          projectId: cloneResult.projectId,
          projectName: cloneResult.projectName,
          serviceId: cloneResult.serviceId,
          serviceName: cloneResult.serviceName,
          environmentId: cloneResult.environmentId,
          deploymentId: cloneResult.deploymentId,
          publicUrl: cloneResult.publicUrl,
          status: 'INITIALIZING',
        },
      });
    } catch (error) {
      console.error('Error deploying Railway instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deploy Railway instance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/railway/instances
 * 获取用户的所有Railway实例
 */
router.get('/instances', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const instances = await prisma.railwayInstance.findMany({
      where: {
        userId,
        status: { not: 'DELETED' },
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
        variables: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: instances,
      count: instances.length,
    });
  } catch (error) {
    console.error('Error fetching instances:', error);
    res.status(500).json({
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
 * POST /api/railway/instances/:instanceId/redeploy
 * 重新部署实例
 */
router.post(
  '/instances/:instanceId/redeploy',
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

      // 初始化Railway服务
      const { cloneService } = initializeRailwayServices();

      // 重新部署实例
      const deploymentId = await cloneService.redeployInstance(instance.serviceId, instance.environmentId);

      res.json({
        success: true,
        message: 'Instance redeployment triggered successfully',
        data: {
          instanceId,
          deploymentId: deploymentId,
          status: 'DEPLOYING',
        },
      });
    } catch (error) {
      console.error('Error redeploying instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to redeploy instance',
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

      // 初始化Railway服务
      const { cloneService } = initializeRailwayServices();

      // 删除实例
      await cloneService.deleteInstance(instance.projectId, instance.serviceId);

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
 * GET /api/railway/instances/:instanceId/status
 * 获取实例状态
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

      // 初始化Railway服务
      const { cloneService } = initializeRailwayServices();

      // 获取实例状态
      const statusResult = await cloneService.getInstanceStatus(instanceId);

      res.json({
        success: true,
        data: {
          instanceId,
          status: statusResult.status,
          deploymentStatus: statusResult.deploymentStatus,
          publicUrl: statusResult.publicUrl,
          errorMessage: statusResult.errorMessage,
          lastUpdated: statusResult.lastUpdated,
          progress: statusResult.progress,
        },
      });
    } catch (error) {
      console.error('Error fetching instance status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch instance status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/railway/instances/:instanceId/variables
 * 更新实例环境变量
 */
router.post(
  '/instances/:instanceId/variables',
  authMiddleware,
  [param('instanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { instanceId } = req.params;
      const { variables } = req.body;

      if (!variables || typeof variables !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Variables must be an object',
        });
        return;
      }

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

      // 初始化Railway服务
      const { cloneService } = initializeRailwayServices();

      // 更新环境变量
      await cloneService.updateInstanceVariables(instance.serviceId, instance.environmentId, variables);

      res.json({
        success: true,
        message: 'Environment variables updated successfully',
        data: {
          instanceId,
          variables: variables,
        },
      });
    } catch (error) {
      console.error('Error updating variables:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update variables',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;