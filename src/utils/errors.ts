import { ErrorCode } from '../types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = ErrorCode.INTERNAL_ERROR, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'خطأ في التحقق من البيانات المدخلة', details?: unknown) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'غير مصرح لك بالوصول', code = ErrorCode.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'لا تملك الصلاحيات الكافية لتنفيذ هذا الإجراء', code = ErrorCode.FORBIDDEN) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'العنصر المطلوب غير موجود', code = ErrorCode.USER_NOT_FOUND) {
    super(message, 404, code);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message = 'رصيدك غير كافٍ لإتمام الطلب.') {
    super(message, 400, ErrorCode.INSUFFICIENT_BALANCE);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = ErrorCode.VALIDATION_ERROR) {
    super(message, 409, code);
  }
}
