"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireClient = exports.requireAdmin = exports.requireActive = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const user_model_1 = require("../models/user.model");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('رمز الدخول مفقود أو غير صالح', types_1.ErrorCode.UNAUTHORIZED);
        }
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        }
        catch {
            throw new errors_1.UnauthorizedError('انتهت صلاحية رمز الدخول أو غير صالح', types_1.ErrorCode.UNAUTHORIZED);
        }
        // Verify user still exists in database and check real status
        const user = await user_model_1.UserModel.findById(decoded.userId).select('role status username');
        if (!user) {
            throw new errors_1.UnauthorizedError('المستخدم غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        if (user.status === types_1.UserStatus.BLOCKED) {
            throw new errors_1.ForbiddenError('تم إيقاف حسابك من قبل الإدارة', types_1.ErrorCode.ACCOUNT_BLOCKED);
        }
        req.user = {
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            status: user.status
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const requireActive = (req, res, next) => {
    if (!req.user) {
        return next(new errors_1.UnauthorizedError('غير مسجل الدخول'));
    }
    if (req.user.status === types_1.UserStatus.PENDING) {
        return next(new errors_1.ForbiddenError('حسابك في انتظار موافقة الإدارة.', types_1.ErrorCode.ACCOUNT_PENDING));
    }
    if (req.user.status === types_1.UserStatus.REJECTED) {
        return next(new errors_1.ForbiddenError('تم رفض حسابك من قبل الإدارة.', types_1.ErrorCode.ACCOUNT_REJECTED));
    }
    if (req.user.status === types_1.UserStatus.BLOCKED) {
        return next(new errors_1.ForbiddenError('تم إيقاف حسابك من قبل الإدارة.', types_1.ErrorCode.ACCOUNT_BLOCKED));
    }
    if (req.user.status !== types_1.UserStatus.ACTIVE) {
        return next(new errors_1.ForbiddenError('الحساب غير نشط', types_1.ErrorCode.FORBIDDEN));
    }
    next();
};
exports.requireActive = requireActive;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new errors_1.UnauthorizedError('غير مصرح لك بالوصول'));
    }
    if (req.user.role !== types_1.UserRole.ADMIN) {
        return next(new errors_1.ForbiddenError('هذه العملية مخصصة لمدير النظام فقط', types_1.ErrorCode.FORBIDDEN));
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireClient = (req, res, next) => {
    if (!req.user) {
        return next(new errors_1.UnauthorizedError('غير مصرح لك بالوصول'));
    }
    if (req.user.role !== types_1.UserRole.CLIENT) {
        return next(new errors_1.ForbiddenError('هذه العملية مخصصة للعملاء فقط', types_1.ErrorCode.FORBIDDEN));
    }
    next();
};
exports.requireClient = requireClient;
