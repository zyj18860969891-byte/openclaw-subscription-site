import { Request, Response, NextFunction } from 'express';
import { jwtService, TokenPayload } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';

/**
 * Extended Express Request with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  token?: string;
}

/**
 * Authentication Middleware
 * 验证JWT令牌并将用户信息附加到请求对象
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('缺少认证令牌');
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' prefix
    const payload = jwtService.verifyToken(token);

    req.user = payload;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_ERROR',
        message: error.message,
      });
    } else {
      res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_ERROR',
        message: '无效的认证令牌',
      });
    }
  }
}

/**
 * Optional Authentication Middleware
 * 尝试验证令牌，但不强制要求
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  // Use _res parameter if needed for future enhancements
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = jwtService.verifyToken(token);
      req.user = payload;
      req.token = token;
    }
  } catch (error) {
    // 静默失败，继续处理请求
  }

  next();
}
