import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

router.get('/', authenticate, controller.getNotifications);
router.patch('/:id/read', authenticate, controller.markAsRead);
router.post('/read-all', authenticate, controller.markAllAsRead);

export default router;
