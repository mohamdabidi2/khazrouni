import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { OrderController } from '../controllers/order.controller';
import { NetworkController } from '../controllers/network.controller';
import { PackController } from '../controllers/pack.controller';
import { AnnouncementController } from '../controllers/announcement.controller';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  addBalanceSchema,
  createNetworkSchema,
  updateNetworkSchema,
  createPackSchema,
  updatePackSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema
} from '../validators';

const router = Router();

// Protect ALL admin routes with authenticate & requireAdmin
router.use(authenticate, requireAdmin);

const adminCtrl = new AdminController();
const orderCtrl = new OrderController();
const networkCtrl = new NetworkController();
const packCtrl = new PackController();
const announcementCtrl = new AnnouncementController();
const walletCtrl = new WalletController();

// 1. Dashboard
router.get('/dashboard', adminCtrl.getDashboard);

// 2. Users Management
router.get('/users', adminCtrl.getUsers);
router.get('/users/:id', adminCtrl.getUserDetails);
router.post('/users/:id/approve', adminCtrl.approveUser);
router.post('/users/:id/reject', adminCtrl.rejectUser);
router.post('/users/:id/block', adminCtrl.blockUser);
router.post('/users/:id/unblock', adminCtrl.unblockUser);
router.post('/users/:id/balance', validateRequest(addBalanceSchema), adminCtrl.addBalance);
router.post('/users/:id/settle-debt', adminCtrl.settleDebt);
router.post('/users/:id/reset-debt', adminCtrl.resetDebt);
router.get('/users/:id/wallet', walletCtrl.getUserWalletByAdmin);

// 3. Orders Management
router.get('/orders', orderCtrl.getAdminOrders);
router.get('/orders/:id', orderCtrl.getOrderById);
router.post('/orders/:id/confirm', orderCtrl.confirmOrder);
router.post('/orders/:id/process', orderCtrl.processOrder);
router.post('/orders/:id/complete', orderCtrl.completeOrder);
router.post('/orders/:id/reject', orderCtrl.rejectOrder);

// 4. Networks Management
router.get('/networks', networkCtrl.getAll);
router.post('/networks', validateRequest(createNetworkSchema), networkCtrl.create);
router.patch('/networks/:id', validateRequest(updateNetworkSchema), networkCtrl.update);
router.delete('/networks/:id', networkCtrl.delete);
router.patch('/networks/:id/status', networkCtrl.toggleStatus);

// 5. Packs Management
router.get('/packs', packCtrl.getAll);
router.get('/packs/:id', packCtrl.getById);
router.post('/packs', validateRequest(createPackSchema), packCtrl.create);
router.patch('/packs/:id', validateRequest(updatePackSchema), packCtrl.update);
router.delete('/packs/:id', packCtrl.delete);
router.patch('/packs/:id/status', packCtrl.toggleStatus);

// 6. Announcements Management
router.get('/announcements', announcementCtrl.getAll);
router.post('/announcements', validateRequest(createAnnouncementSchema), announcementCtrl.create);
router.patch('/announcements/:id', validateRequest(updateAnnouncementSchema), announcementCtrl.update);
router.delete('/announcements/:id', announcementCtrl.delete);

export default router;
