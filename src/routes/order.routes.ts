import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, requireActive, requireClient } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createOrderSchema } from '../validators';

const router = Router();
const controller = new OrderController();

// Create order: Client only, active only, validated
router.post(
  '/',
  authenticate,
  requireClient,
  requireActive,
  validateRequest(createOrderSchema),
  controller.createOrder
);

// My orders
router.get('/my', authenticate, requireClient, controller.getMyOrders);

// Order by id (client or admin)
router.get('/:id', authenticate, controller.getOrderById);

// Cancel order: Client only, pending only
router.post('/:id/cancel', authenticate, requireClient, controller.cancelOrder);

export default router;
