import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ErrorCode } from '../types';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // If it's an AppError instance
  if (err instanceof AppError) {
    logger.warn({
      path: req.originalUrl,
      method: req.method,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode
    });

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {})
    });
  }

  // Handle MongoDB Duplicate Key Error (e.g. unique username / orderNumber)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((err as any).code === 11000) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const field = Object.keys((err as any).keyPattern || {})[0] || 'field';
    const isUsername = field === 'username';
    return res.status(409).json({
      success: false,
      message: isUsername ? 'اسم المستخدم مسجل مسبقاً' : `القيمة المدخلة في حقل ${field} مكررة`,
      code: isUsername ? ErrorCode.DUPLICATE_USERNAME : ErrorCode.VALIDATION_ERROR
    });
  }

  // Handle JWT errors if thrown directly
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'رمز الدخول غير صالح أو منتهي الصلاحية',
      code: ErrorCode.UNAUTHORIZED
    });
  }

  // Unhandled / Internal Server Errors
  logger.error({ err, path: req.originalUrl, method: req.method }, '💥 Unexpected server error');

  return res.status(500).json({
    success: false,
    message: 'حدث خطأ داخلي في الخادم',
    code: ErrorCode.INTERNAL_ERROR
  });
};
