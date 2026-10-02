"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const user_repository_1 = require("../repositories/user.repository");
const refresh_token_model_1 = require("../models/refresh-token.model");
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
class AuthService {
    userRepo;
    constructor() {
        this.userRepo = new user_repository_1.UserRepository();
    }
    async register(username, fullName, password) {
        const existing = await this.userRepo.findByUsername(username);
        if (existing) {
            throw new errors_1.ConflictError('اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر', types_1.ErrorCode.DUPLICATE_USERNAME);
        }
        if (password.length < 8) {
            throw new errors_1.AppError('يجب أن لا تقل كلمة المرور عن 8 أحرف', 400, types_1.ErrorCode.VALIDATION_ERROR);
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = await this.userRepo.create({
            username: username.toLowerCase().trim(),
            fullName: fullName.trim(),
            passwordHash,
            role: types_1.UserRole.CLIENT,
            status: types_1.UserStatus.PENDING,
            balance: 0
        });
        return {
            user: {
                _id: newUser._id,
                username: newUser.username,
                fullName: newUser.fullName,
                role: newUser.role,
                status: newUser.status,
                balance: newUser.balance,
                createdAt: newUser.createdAt
            },
            message: 'تم إنشاء حسابك بنجاح. حسابك في انتظار موافقة الإدارة.'
        };
    }
    async login(username, password) {
        const user = await this.userRepo.findByUsername(username);
        if (!user) {
            throw new errors_1.UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة', types_1.ErrorCode.INVALID_CREDENTIALS);
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new errors_1.UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة', types_1.ErrorCode.INVALID_CREDENTIALS);
        }
        // Role-independent status checks (especially for clients)
        if (user.status === types_1.UserStatus.PENDING) {
            throw new errors_1.ForbiddenError('حسابك في انتظار موافقة الإدارة.', types_1.ErrorCode.ACCOUNT_PENDING);
        }
        if (user.status === types_1.UserStatus.REJECTED) {
            throw new errors_1.ForbiddenError('تم رفض حسابك من قبل الإدارة.', types_1.ErrorCode.ACCOUNT_REJECTED);
        }
        if (user.status === types_1.UserStatus.BLOCKED) {
            throw new errors_1.ForbiddenError('تم إيقاف حسابك من قبل الإدارة.', types_1.ErrorCode.ACCOUNT_BLOCKED);
        }
        // Update lastLoginAt
        await this.userRepo.updateById(user._id.toString(), { lastLoginAt: new Date() });
        const tokens = await this.generateTokens(user);
        return {
            user: {
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                status: user.status,
                balance: user.balance,
                debt: user.debt || 0,
                createdAt: user.createdAt
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }
    async refreshToken(refreshTokenString) {
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshTokenString, env_1.env.JWT_REFRESH_SECRET);
        }
        catch {
            throw new errors_1.UnauthorizedError('جلسة التحديث غير صالحة أو منتهية', types_1.ErrorCode.UNAUTHORIZED);
        }
        const tokenHash = crypto_1.default.createHash('sha256').update(refreshTokenString).digest('hex');
        const storedToken = await refresh_token_model_1.RefreshTokenModel.findOne({
            userId: decoded.userId,
            tokenHash,
            revokedAt: { $exists: false }
        });
        if (!storedToken) {
            throw new errors_1.UnauthorizedError('جلسة التحديث ملغاة أو غير صالحة', types_1.ErrorCode.UNAUTHORIZED);
        }
        const user = await this.userRepo.findById(decoded.userId);
        if (!user || user.status !== types_1.UserStatus.ACTIVE) {
            throw new errors_1.ForbiddenError('الحساب غير نشط أو غير موجود', types_1.ErrorCode.FORBIDDEN);
        }
        // Revoke old refresh token (Token rotation)
        storedToken.revokedAt = new Date();
        await storedToken.save();
        // Generate new pair
        return this.generateTokens(user);
    }
    async logout(refreshTokenString) {
        if (!refreshTokenString)
            return;
        const tokenHash = crypto_1.default.createHash('sha256').update(refreshTokenString).digest('hex');
        await refresh_token_model_1.RefreshTokenModel.updateOne({ tokenHash }, { revokedAt: new Date() });
    }
    async changePassword(userId, oldPass, newPass) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new errors_1.UnauthorizedError('المستخدم غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        const isMatch = await bcryptjs_1.default.compare(oldPass, user.passwordHash);
        if (!isMatch) {
            throw new errors_1.UnauthorizedError('كلمة المرور الحالية غير صحيحة', types_1.ErrorCode.INVALID_CREDENTIALS);
        }
        if (newPass.length < 8) {
            throw new errors_1.AppError('يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف', 400, types_1.ErrorCode.VALIDATION_ERROR);
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const newHash = await bcryptjs_1.default.hash(newPass, salt);
        await this.userRepo.updateById(userId, { passwordHash: newHash });
        // Revoke all refresh tokens for this user on password change
        await refresh_token_model_1.RefreshTokenModel.updateMany({ userId }, { revokedAt: new Date() });
    }
    async generateTokens(user) {
        const payload = {
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            status: user.status
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
            expiresIn: env_1.env.JWT_ACCESS_EXPIRES
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user._id.toString() }, env_1.env.JWT_REFRESH_SECRET, {
            expiresIn: env_1.env.JWT_REFRESH_EXPIRES
        });
        // Store hashed refresh token in DB
        const tokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await refresh_token_model_1.RefreshTokenModel.create({
            userId: user._id,
            tokenHash,
            expiresAt
        });
        return { accessToken, refreshToken };
    }
}
exports.AuthService = AuthService;
