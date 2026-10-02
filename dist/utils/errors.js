"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.InsufficientBalanceError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.AppError = void 0;
const types_1 = require("../types");
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode = 500, code = types_1.ErrorCode.INTERNAL_ERROR, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message = 'خطأ في التحقق من البيانات المدخلة', details) {
        super(message, 400, types_1.ErrorCode.VALIDATION_ERROR, details);
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = 'غير مصرح لك بالوصول', code = types_1.ErrorCode.UNAUTHORIZED) {
        super(message, 401, code);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'لا تملك الصلاحيات الكافية لتنفيذ هذا الإجراء', code = types_1.ErrorCode.FORBIDDEN) {
        super(message, 403, code);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'العنصر المطلوب غير موجود', code = types_1.ErrorCode.USER_NOT_FOUND) {
        super(message, 404, code);
    }
}
exports.NotFoundError = NotFoundError;
class InsufficientBalanceError extends AppError {
    constructor(message = 'رصيدك غير كافٍ لإتمام الطلب.') {
        super(message, 400, types_1.ErrorCode.INSUFFICIENT_BALANCE);
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
class ConflictError extends AppError {
    constructor(message, code = types_1.ErrorCode.VALIDATION_ERROR) {
        super(message, 409, code);
    }
}
exports.ConflictError = ConflictError;
