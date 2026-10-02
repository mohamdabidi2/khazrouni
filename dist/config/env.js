"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/khazrouni_giga',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key_khazrouni_access_321!',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_secret_key_khazrouni_refresh_321!',
    JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
    JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin_khazrouni',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecure@2026!',
    ADMIN_FULL_NAME: process.env.ADMIN_FULL_NAME || 'المدير العام'
};
