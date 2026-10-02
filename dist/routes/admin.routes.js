"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const order_controller_1 = require("../controllers/order.controller");
const network_controller_1 = require("../controllers/network.controller");
const pack_controller_1 = require("../controllers/pack.controller");
const announcement_controller_1 = require("../controllers/announcement.controller");
const wallet_controller_1 = require("../controllers/wallet.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const validators_1 = require("../validators");
const router = (0, express_1.Router)();
// Protect ALL admin routes with authenticate & requireAdmin
router.use(auth_middleware_1.authenticate, auth_middleware_1.requireAdmin);
const adminCtrl = new admin_controller_1.AdminController();
const orderCtrl = new order_controller_1.OrderController();
const networkCtrl = new network_controller_1.NetworkController();
const packCtrl = new pack_controller_1.PackController();
const announcementCtrl = new announcement_controller_1.AnnouncementController();
const walletCtrl = new wallet_controller_1.WalletController();
// 1. Dashboard
router.get('/dashboard', adminCtrl.getDashboard);
// 2. Users Management
router.get('/users', adminCtrl.getUsers);
router.get('/users/:id', adminCtrl.getUserDetails);
router.post('/users/:id/approve', adminCtrl.approveUser);
router.post('/users/:id/reject', adminCtrl.rejectUser);
router.post('/users/:id/block', adminCtrl.blockUser);
router.post('/users/:id/unblock', adminCtrl.unblockUser);
router.post('/users/:id/balance', (0, validate_middleware_1.validateRequest)(validators_1.addBalanceSchema), adminCtrl.addBalance);
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
router.post('/networks', (0, validate_middleware_1.validateRequest)(validators_1.createNetworkSchema), networkCtrl.create);
router.patch('/networks/:id', (0, validate_middleware_1.validateRequest)(validators_1.updateNetworkSchema), networkCtrl.update);
router.delete('/networks/:id', networkCtrl.delete);
router.patch('/networks/:id/status', networkCtrl.toggleStatus);
// 5. Packs Management
router.get('/packs', packCtrl.getAll);
router.get('/packs/:id', packCtrl.getById);
router.post('/packs', (0, validate_middleware_1.validateRequest)(validators_1.createPackSchema), packCtrl.create);
router.patch('/packs/:id', (0, validate_middleware_1.validateRequest)(validators_1.updatePackSchema), packCtrl.update);
router.delete('/packs/:id', packCtrl.delete);
router.patch('/packs/:id/status', packCtrl.toggleStatus);
// 6. Announcements Management
router.get('/announcements', announcementCtrl.getAll);
router.post('/announcements', (0, validate_middleware_1.validateRequest)(validators_1.createAnnouncementSchema), announcementCtrl.create);
router.patch('/announcements/:id', (0, validate_middleware_1.validateRequest)(validators_1.updateAnnouncementSchema), announcementCtrl.update);
router.delete('/announcements/:id', announcementCtrl.delete);
exports.default = router;
