import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
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
