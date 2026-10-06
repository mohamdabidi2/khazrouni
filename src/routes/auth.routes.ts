import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema
} from '../validators';

const router = Router();
const controller = new AuthController();

router.post('/register', authRateLimiter, validateRequest(registerSchema), controller.register);
router.post('/login', authRateLimiter, validateRequest(loginSchema), controller.login);
router.post('/refresh', authRateLimiter, validateRequest(refreshTokenSchema), controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), controller.changePassword);
router.put('/fcm-token', authenticate, controller.saveFcmToken);

export default router;
