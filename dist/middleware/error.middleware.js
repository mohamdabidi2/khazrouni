"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
    // If it's an AppError instance
    if (err instanceof errors_1.AppError) {
        logger_1.logger.warn({
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
    if (err.code === 11000) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        const isUsername = field === 'username';
        return res.status(409).json({
            success: false,
            message: isUsername ? 'اسم المستخدم مسجل مسبقاً' : `القيمة المدخلة في حقل ${field} مكررة`,
            code: isUsername ? types_1.ErrorCode.DUPLICATE_USERNAME : types_1.ErrorCode.VALIDATION_ERROR
        });
    }
    // Handle JWT errors if thrown directly
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'رمز الدخول غير صالح أو منتهي الصلاحية',
            code: types_1.ErrorCode.UNAUTHORIZED
        });
    }
    // Unhandled / Internal Server Errors
    logger_1.logger.error({ err, path: req.originalUrl, method: req.method }, '💥 Unexpected server error');
    return res.status(500).json({
        success: false,
        message: 'حدث خطأ داخلي في الخادم',
        code: types_1.ErrorCode.INTERNAL_ERROR
    });
};
exports.errorHandler = errorHandler;
