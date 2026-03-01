import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { subscriptionService } from '../services/subscription/subscription-service';
import { AppError, ValidationError } from '../utils/errors';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

/**
 * 获取所有订阅计划信息
 * GET /api/subscription/plans
 */
router.get('/plans', (req: Request, res: Response) => {
  try {
    // Use req parameter if needed for future enhancements
    console.log(`Getting subscription plans for request from ${req.ip}`);
    
    const plans = ['BASIC', 'PRO', 'ENTERPRISE'].map((plan) =>
      subscriptionService.getPlanInfo(plan as any)
    );

    return res.json(
      successResponse(plans, '获取计划信息成功')
    );
  } catch (error) {
    console.error('获取计划信息失败:', error);
    return res.status(500).json(errorResponse('获取计划信息失败', 'INTERNAL_ERROR'));
  }
});

/**
 * 获取单个计划详情
 * GET /api/subscription/plans/:plan
 */
router.get('/plans/:plan', (req: Request, res: Response) => {
  try {
    const { plan } = req.params;

    if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return res.status(400).json(errorResponse('无效的计划类型', 'INVALID_PLAN'));
    }

    const planInfo = subscriptionService.getPlanInfo(plan as any);

    return res.json(
      successResponse(planInfo, '获取计划详情成功')
    );
  } catch (error) {
    console.error('获取计划详情失败:', error);
    return res.status(500).json(errorResponse('获取计划详情失败', 'INTERNAL_ERROR'));
  }
});

/**
 * 获取用户当前订阅
 * GET /api/subscription/current
 */
router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      return res.json(
        successResponse(null, '用户无有效订阅')
      );
    }

    return res.json(
      successResponse(subscription, '获取订阅信息成功')
    );
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message, error.code));
    }
    console.error('获取订阅信息失败:', error);
    return res.status(500).json(errorResponse('获取订阅信息失败', 'INTERNAL_ERROR'));
  }
});

/**
 * 创建订阅
 * POST /api/subscription/create
 */
router.post(
  '/create',
  authMiddleware,
  [
    body('plan')
      .isIn(['BASIC', 'PRO', 'ENTERPRISE'])
      .withMessage('无效的计划类型'),
    body('autoRenew').optional().isBoolean().withMessage('自动续费参数错误'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('参数验证失败');
      }

      const userId = (req as any).user?.userId;
      const { plan, autoRenew } = req.body;

      const subscription = await subscriptionService.createSubscription({
        userId,
        plan,
        autoRenew,
      });

      return res.status(201).json(
        successResponse(subscription, '订阅创建成功')
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json(errorResponse(error.message, error.code));
      }
      console.error('创建订阅失败:', error);
      return res.status(500).json(errorResponse('创建订阅失败', 'INTERNAL_ERROR'));
    }
  }
);

/**
 * 升级订阅计划
 * PUT /api/subscription/upgrade
 */
router.put(
  '/upgrade',
  authMiddleware,
  [
    body('plan')
      .isIn(['BASIC', 'PRO', 'ENTERPRISE'])
      .withMessage('无效的计划类型'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('参数验证失败');
      }

      const userId = (req as any).user?.userId;
      const { plan } = req.body;

      const subscription = await subscriptionService.upgradeSubscription(userId, plan);

      return res.json(
        successResponse(subscription, '订阅升级成功')
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json(errorResponse(error.message, error.code));
      }
      console.error('升级订阅失败:', error);
      return res.status(500).json(errorResponse('升级订阅失败', 'INTERNAL_ERROR'));
    }
  }
);

/**
 * 取消订阅
 * POST /api/subscription/cancel
 */
router.post('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    await subscriptionService.cancelSubscription(userId);

    return res.json(
      successResponse({ success: true }, '订阅已取消')
    );
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message, error.code));
    }
    console.error('取消订阅失败:', error);
    return res.status(500).json(errorResponse('取消订阅失败', 'INTERNAL_ERROR'));
  }
});

/**
 * 续费订阅
 * POST /api/subscription/renew
 */
router.post('/renew', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const subscription = await subscriptionService.renewSubscription(userId);

    return res.json(
      successResponse(subscription, '续费成功')
    );
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message, error.code));
    }
    console.error('续费失败:', error);
    return res.status(500).json(errorResponse('续费失败', 'INTERNAL_ERROR'));
  }
});

/**
 * 检查订阅是否有效
 * GET /api/subscription/active
 */
router.get('/active', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const isActive = await subscriptionService.isSubscriptionActive(userId);

    return res.json(
      successResponse({ active: isActive }, '查询成功')
    );
  } catch (error) {
    console.error('检查订阅状态失败:', error);
    return res.status(500).json(errorResponse('检查订阅状态失败', 'INTERNAL_ERROR'));
  }
});

export default router;
