import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new WalletController();

router.get('/', authenticate, controller.getBalance);
router.get('/transactions', authenticate, controller.getTransactions);

export default router;
