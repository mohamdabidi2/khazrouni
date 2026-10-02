import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
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

export const apiRateLimiter = rateLimit({
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
