import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { userService } from '../services/auth/user-service';
import { jwtService } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticationError, ValidationError } from '../utils/errors';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('fullName').optional().isString().trim(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          errorResponse('参数验证失败', 'VALIDATION_ERROR', errors.array())
        );
      }

      const { email, password, fullName } = req.body;

      // 创建用户
      const user = await userService.createUser({
        email,
        password,
        fullName,
      });

      // 生成令牌
      const tokens = jwtService.generateTokenPair(user.id, user.email);

      // 返回成功响应
      return res.status(201).json(
        successResponse(
          {
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
            },
            ...tokens,
          },
          '注册成功',
          'REGISTRATION_SUCCESS'
        )
      );
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        return res.status(400).json(
          errorResponse(error.message, error.code)
        );
      }

      if ((error as any).code === 'P2002') {
        return res.status(409).json(
          errorResponse('该邮箱已被注册', 'EMAIL_EXISTS')
        );
      }

      console.error('Registration error:', error);
      return res.status(500).json(
        errorResponse('注册失败，请稍后重试', 'REGISTRATION_FAILED')
      );
    }
  }
);

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          errorResponse('参数验证失败', 'VALIDATION_ERROR', errors.array())
        );
      }

      const { email, password } = req.body;

      // 验证用户凭证
      const user = await userService.verifyCredentials(email, password);

      // 生成令牌
      const tokens = jwtService.generateTokenPair(user.id, user.email);

      return res.json(
        successResponse(
          {
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              subscriptionStatus: user.subscriptionStatus,
              subscriptionPlan: user.subscriptionPlan,
            },
            ...tokens,
          },
          '登录成功',
          'LOGIN_SUCCESS'
        )
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(
          errorResponse(error.message, error.code)
        );
      }

      if (error instanceof AuthenticationError) {
        return res.status(401).json(
          errorResponse(error.message, error.code)
        );
      }

      console.error('Login error:', error);
      return res.status(500).json(
        errorResponse('登录失败，请稍后重试', 'LOGIN_FAILED')
      );
    }
  }
);

/**
 * POST /api/auth/refresh-token
 * 刷新访问令牌
 */
router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          errorResponse('参数验证失败', 'VALIDATION_ERROR', errors.array())
        );
      }

      const { refreshToken } = req.body;

      // 验证刷新令牌
      const payload = jwtService.verifyToken(refreshToken);
      const user = await userService.getUserById(payload.userId);

      if (!user) {
        throw new AuthenticationError('用户不存在');
      }

      // 生成新的令牌对
      const tokens = jwtService.generateTokenPair(user.id, user.email);

      return res.json(
        successResponse(tokens, '令牌已刷新', 'TOKEN_REFRESHED')
      );
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json(
          errorResponse(error.message, error.code)
        );
      }

      console.error('Token refresh error:', error);
      return res.status(500).json(
        errorResponse('令牌刷新失败', 'TOKEN_REFRESH_FAILED')
      );
    }
  }
);

/**
 * POST /api/auth/logout
 * 用户登出
 */
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  // Use req parameter if needed for future enhancements
  console.log(`User ${req.user?.userId} logged out from ${req.ip}`);
  
  // 在这个实现中，我们不需要做任何特殊的事情
  // 客户端应该删除本地存储的令牌
  // 如果需要令牌黑名单，可以使用Redis

  return res.json(
    successResponse(null, '登出成功', 'LOGOUT_SUCCESS')
  );
});

/**
 * GET /api/auth/profile
 * 获取当前用户信息
 */
router.get(
  '/profile',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('认证信息缺失');
      }

      const user = await userService.getUserById(req.user.userId);
      if (!user) {
        throw new AuthenticationError('用户不存在');
      }

      return res.json(
        successResponse(
          {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionPlan: user.subscriptionPlan,
            subscriptionEndDate: user.subscriptionEndDate,
            createdAt: user.createdAt,
          },
          '获取用户信息成功',
          'PROFILE_FETCHED'
        )
      );
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(401).json(
        errorResponse('获取用户信息失败', 'PROFILE_FETCH_FAILED')
      );
    }
  }
);

/**
 * PUT /api/auth/profile
 * 更新用户信息
 */
router.put(
  '/profile',
  authMiddleware,
  [body('fullName').optional().isString().trim()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          errorResponse('参数验证失败', 'VALIDATION_ERROR', errors.array())
        );
      }

      if (!req.user) {
        throw new AuthenticationError('认证信息缺失');
      }

      const { fullName } = req.body;

      const user = await userService.updateUser(req.user.userId, {
        fullName,
      });

      return res.json(
        successResponse(
          {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
          },
          '用户信息更新成功',
          'PROFILE_UPDATED'
        )
      );
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json(
        errorResponse('更新用户信息失败', 'PROFILE_UPDATE_FAILED')
      );
    }
  }
);

/**
 * POST /api/auth/change-password
 * 修改密码
 */
router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          errorResponse('参数验证失败', 'VALIDATION_ERROR', errors.array())
        );
      }

      if (!req.user) {
        throw new AuthenticationError('认证信息缺失');
      }

      const { currentPassword, newPassword } = req.body;

      await userService.changePassword(
        req.user.userId,
        currentPassword,
        newPassword
      );

      return res.json(
        successResponse(null, '密码修改成功', 'PASSWORD_CHANGED')
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(
          errorResponse(error.message, error.code)
        );
      }

      console.error('Change password error:', error);
      return res.status(500).json(
        errorResponse('密码修改失败', 'PASSWORD_CHANGE_FAILED')
      );
    }
  }
);

export default router;
