import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest, IJwtPayload, UserRole, UserStatus, ErrorCode } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserModel } from '../models/user.model';

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('رمز الدخول مفقود أو غير صالح', ErrorCode.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    let decoded: IJwtPayload;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as IJwtPayload;
    } catch {
      throw new UnauthorizedError('انتهت صلاحية رمز الدخول أو غير صالح', ErrorCode.UNAUTHORIZED);
    }

    // Verify user still exists in database and check real status
    const user = await UserModel.findById(decoded.userId).select('role status username');
    if (!user) {
      throw new UnauthorizedError('المستخدم غير موجود', ErrorCode.USER_NOT_FOUND);
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError('تم إيقاف حسابك من قبل الإدارة', ErrorCode.ACCOUNT_BLOCKED);
    }

    req.user = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      status: user.status
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireActive = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('غير مسجل الدخول'));
  }

  if (req.user.status === UserStatus.PENDING) {
    return next(new ForbiddenError('حسابك في انتظار موافقة الإدارة.', ErrorCode.ACCOUNT_PENDING));
  }

  if (req.user.status === UserStatus.REJECTED) {
    return next(new ForbiddenError('تم رفض حسابك من قبل الإدارة.', ErrorCode.ACCOUNT_REJECTED));
  }

  if (req.user.status === UserStatus.BLOCKED) {
    return next(new ForbiddenError('تم إيقاف حسابك من قبل الإدارة.', ErrorCode.ACCOUNT_BLOCKED));
  }

  if (req.user.status !== UserStatus.ACTIVE) {
    return next(new ForbiddenError('الحساب غير نشط', ErrorCode.FORBIDDEN));
  }

  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('غير مصرح لك بالوصول'));
  }

  if (req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError('هذه العملية مخصصة لمدير النظام فقط', ErrorCode.FORBIDDEN));
  }

  next();
};

export const requireClient = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('غير مصرح لك بالوصول'));
  }

  if (req.user.role !== UserRole.CLIENT) {
    return next(new ForbiddenError('هذه العملية مخصصة للعملاء فقط', ErrorCode.FORBIDDEN));
  }

  next();
};
