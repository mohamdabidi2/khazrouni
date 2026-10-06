"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const uuid_1 = require("uuid");
const mongoose_1 = require("mongoose");
const wallet_repository_1 = require("../repositories/wallet.repository");
const user_repository_1 = require("../repositories/user.repository");
const audit_log_repository_1 = require("../repositories/audit-log.repository");
const notification_repository_1 = require("../repositories/notification.repository");
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const transaction_util_1 = require("../utils/transaction.util");
const socket_service_1 = require("../sockets/socket.service");
const fcm_service_1 = require("./fcm.service");
class WalletService {
    walletRepo;
    userRepo;
    auditRepo;
    notificationRepo;
    constructor() {
        this.walletRepo = new wallet_repository_1.WalletRepository();
        this.userRepo = new user_repository_1.UserRepository();
        this.auditRepo = new audit_log_repository_1.AuditLogRepository();
        this.notificationRepo = new notification_repository_1.NotificationRepository();
    }
    async getBalance(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('المستخدم غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        return user.balance;
    }
    async getTransactions(userId, page = 1, limit = 20) {
        return this.walletRepo.findByUserId(userId, page, limit);
    }
    async getTransactionsByOrderId(orderId) {
        return this.walletRepo.findByOrderId(orderId);
    }
    async adminAddBalance(params) {
        const { userId, adminId, amount, description, ip, userAgent } = params;
        if (amount <= 0) {
            throw new errors_1.AppError('يجب أن يكون المبلغ المضاف أكبر من الصفر', 400, types_1.ErrorCode.VALIDATION_ERROR);
        }
        return (0, transaction_util_1.runInTransaction)(async (session) => {
            const user = await this.userRepo.findById(userId, session);
            if (!user) {
                throw new errors_1.NotFoundError('العميل غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
            }
            const balanceBefore = user.balance;
            const balanceAfter = Math.round((balanceBefore + amount) * 1000) / 1000;
            const updatedUser = await this.userRepo.updateBalance(userId, amount, session);
            if (!updatedUser) {
                throw new errors_1.AppError('فشل في تحديث الرصيد', 500, types_1.ErrorCode.INTERNAL_ERROR);
            }
            const transactionId = `TX-${Date.now()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
            const financialOpId = `ADMIN_DEPOSIT_${Date.now()}_${(0, uuid_1.v4)().substring(0, 6)}`;
            const transaction = await this.walletRepo.createTransaction({
                transactionId,
                financialOperationId: financialOpId,
                userId: new mongoose_1.Types.ObjectId(userId),
                adminId: new mongoose_1.Types.ObjectId(adminId),
                type: types_1.WalletTransactionType.DEPOSIT,
                amount,
                balanceBefore,
                balanceAfter,
                description: description || 'إيداع رصيد من قبل الإدارة',
                reference: `ADMIN-${adminId}`
            }, session);
            // Create Audit Log
            await this.auditRepo.create({
                adminId: new mongoose_1.Types.ObjectId(adminId),
                action: types_1.AuditAction.BALANCE_ADDED,
                entityType: 'User',
                entityId: userId,
                metadata: {
                    amount,
                    balanceBefore,
                    balanceAfter,
                    transactionId
                },
                ip,
                userAgent
            });
            // Send notification to user
            const notif = await this.notificationRepo.create({
                userId: new mongoose_1.Types.ObjectId(userId),
                title: 'إيداع رصيد',
                message: `تمت إضافة رصيد بقيمة ${amount.toFixed(3)} د.ت إلى محفظتك. رصيدك الحالي: ${balanceAfter.toFixed(3)} د.ت`,
                type: types_1.NotificationType.SYSTEM,
                metadata: { transactionId, amount, balanceAfter }
            }, session);
            // Emit real-time socket events
            socket_service_1.SocketEmitter.emitToUser(userId, 'wallet.updated', { balance: balanceAfter, transaction });
            socket_service_1.SocketEmitter.emitToUser(userId, 'notification.created', notif);
            // FCM
            fcm_service_1.FcmEmitter.emitToUser(userId, notif.title, notif.message).catch(() => { });
            return {
                balance: balanceAfter,
                transaction
            };
        });
    }
    async getDebt(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('المستخدم غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        return user.debt || 0;
    }
    async adminSettleDebt(params) {
        const { userId, adminId, amount, description, ip, userAgent } = params;
        if (amount <= 0) {
            throw new errors_1.AppError('يجب أن يكون المبلغ المسدد أكبر من الصفر', 400, types_1.ErrorCode.VALIDATION_ERROR);
        }
        return (0, transaction_util_1.runInTransaction)(async (session) => {
            const user = await this.userRepo.findById(userId, session);
            if (!user) {
                throw new errors_1.NotFoundError('العميل غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
            }
            const debtBefore = user.debt || 0;
            if (debtBefore <= 0) {
                throw new errors_1.AppError('لا توجد ديون مستحقة على هذا الحساب', 400, types_1.ErrorCode.VALIDATION_ERROR);
            }
            const settledResult = await this.userRepo.settleDebt(userId, amount, session);
            if (!settledResult) {
                throw new errors_1.AppError('فشل في تسجيل تسديد الدين', 500, types_1.ErrorCode.INTERNAL_ERROR);
            }
            const { user: updatedUser, settledAmount } = settledResult;
            const debtAfter = updatedUser.debt || 0;
            const transactionId = `TX-${Date.now()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
            const financialOpId = `DEBT_PAYMENT_${Date.now()}_${(0, uuid_1.v4)().substring(0, 6)}`;
            const transaction = await this.walletRepo.createTransaction({
                transactionId,
                financialOperationId: financialOpId,
                userId: new mongoose_1.Types.ObjectId(userId),
                adminId: new mongoose_1.Types.ObjectId(adminId),
                type: types_1.WalletTransactionType.DEBT_PAYMENT,
                amount: -settledAmount,
                balanceBefore: debtBefore,
                balanceAfter: debtAfter,
                description: description || `تسديد دفعة من الدين بقيمة ${settledAmount.toFixed(3)} د.ت`,
                reference: `ADMIN-${adminId}`
            }, session);
            // Audit Log
            await this.auditRepo.create({
                adminId: new mongoose_1.Types.ObjectId(adminId),
                action: types_1.AuditAction.DEBT_SETTLED,
                entityType: 'User',
                entityId: userId,
                metadata: {
                    settledAmount,
                    debtBefore,
                    debtAfter,
                    transactionId,
                    note: description
                },
                ip,
                userAgent
            });
            // Notification
            const notif = await this.notificationRepo.create({
                userId: new mongoose_1.Types.ObjectId(userId),
                title: 'تسديد دفعة من الدين',
                message: `تم تسجيل خلاص مبلغ ${settledAmount.toFixed(3)} د.ت من دينك بنجاح. الدين المتبقي: ${debtAfter.toFixed(3)} د.ت`,
                type: types_1.NotificationType.DEBT_SETTLED,
                metadata: { transactionId, settledAmount, debtAfter }
            }, session);
            // Sockets
            socket_service_1.SocketEmitter.emitToUser(userId, 'user.debt_updated', { debt: debtAfter });
            socket_service_1.SocketEmitter.emitToUser(userId, 'wallet.updated', { debt: debtAfter, transaction });
            socket_service_1.SocketEmitter.emitToUser(userId, 'notification.created', notif);
            // FCM
            fcm_service_1.FcmEmitter.emitToUser(userId, notif.title, notif.message).catch(() => { });
            return {
                settledAmount,
                debtBefore,
                debtAfter,
                user: updatedUser,
                transaction
            };
        });
    }
    async adminResetDebt(params) {
        const { userId, adminId, description, ip, userAgent } = params;
        return (0, transaction_util_1.runInTransaction)(async (session) => {
            const user = await this.userRepo.findById(userId, session);
            if (!user) {
                throw new errors_1.NotFoundError('العميل غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
            }
            const debtBefore = user.debt || 0;
            const resetResult = await this.userRepo.resetDebt(userId, session);
            if (!resetResult) {
                throw new errors_1.AppError('فشل في تصفير الدين', 500, types_1.ErrorCode.INTERNAL_ERROR);
            }
            const { user: updatedUser, clearedAmount } = resetResult;
            const debtAfter = 0;
            const transactionId = `TX-${Date.now()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
            const financialOpId = `DEBT_RESET_${Date.now()}_${(0, uuid_1.v4)().substring(0, 6)}`;
            const transaction = await this.walletRepo.createTransaction({
                transactionId,
                financialOperationId: financialOpId,
                userId: new mongoose_1.Types.ObjectId(userId),
                adminId: new mongoose_1.Types.ObjectId(adminId),
                type: types_1.WalletTransactionType.DEBT_RESET,
                amount: -clearedAmount,
                balanceBefore: debtBefore,
                balanceAfter: 0,
                description: description || `تصفير كامل الدين (خلاص كامل الحساب: ${clearedAmount.toFixed(3)} د.ت)`,
                reference: `ADMIN-${adminId}`
            }, session);
            // Audit Log
            await this.auditRepo.create({
                adminId: new mongoose_1.Types.ObjectId(adminId),
                action: types_1.AuditAction.DEBT_RESET,
                entityType: 'User',
                entityId: userId,
                metadata: {
                    clearedAmount,
                    debtBefore,
                    debtAfter: 0,
                    transactionId,
                    note: description
                },
                ip,
                userAgent
            });
            // Notification
            const notif = await this.notificationRepo.create({
                userId: new mongoose_1.Types.ObjectId(userId),
                title: 'خلاص كامل الدين',
                message: `تم تصفير دين حسابك بالكامل بنجاح (${clearedAmount.toFixed(3)} د.ت). ليس عليك أي ديون حالياً.`,
                type: types_1.NotificationType.DEBT_SETTLED,
                metadata: { transactionId, clearedAmount, debtAfter: 0 }
            }, session);
            // Sockets
            socket_service_1.SocketEmitter.emitToUser(userId, 'user.debt_updated', { debt: 0 });
            socket_service_1.SocketEmitter.emitToUser(userId, 'wallet.updated', { debt: 0, transaction });
            socket_service_1.SocketEmitter.emitToUser(userId, 'notification.created', notif);
            // FCM
            fcm_service_1.FcmEmitter.emitToUser(userId, notif.title, notif.message).catch(() => { });
            return {
                clearedAmount,
                debtBefore,
                debtAfter: 0,
                user: updatedUser,
                transaction
            };
        });
    }
}
exports.WalletService = WalletService;
