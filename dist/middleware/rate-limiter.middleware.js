"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'عدد الطلبات كبير جداً. يرجى الانتظار.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
