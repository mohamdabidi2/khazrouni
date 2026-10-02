import { Router } from 'express';
import { ClientController } from '../controllers/client.controller';
import { authenticate, requireActive, requireClient } from '../middleware/auth.middleware';

const router = Router();
const controller = new ClientController();

router.get('/dashboard', authenticate, requireClient, requireActive, controller.getDashboard);

export default router;
