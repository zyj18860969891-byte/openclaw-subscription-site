import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * Error Handling Middleware
 * 捕获和格式化所有错误响应
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Use _req and _next parameters if needed for future enhancements
  console.error(`Error in request:`, error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: '内部服务器错误',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `找不到路由: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
}
