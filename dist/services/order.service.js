"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const order_repository_1 = require("../repositories/order.repository");
const pack_repository_1 = require("../repositories/pack.repository");
const network_repository_1 = require("../repositories/network.repository");
const user_repository_1 = require("../repositories/user.repository");
const wallet_repository_1 = require("../repositories/wallet.repository");
const notification_repository_1 = require("../repositories/notification.repository");
const audit_log_repository_1 = require("../repositories/audit-log.repository");
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const transaction_util_1 = require("../utils/transaction.util");
const socket_service_1 = require("../sockets/socket.service");
class OrderService {
    orderRepo;
    packRepo;
    networkRepo;
    userRepo;
    walletRepo;
    notifRepo;
    auditRepo;
    constructor() {
        this.orderRepo = new order_repository_1.OrderRepository();
        this.packRepo = new pack_repository_1.PackRepository();
        this.networkRepo = new network_repository_1.NetworkRepository();
        this.userRepo = new user_repository_1.UserRepository();
        this.walletRepo = new wallet_repository_1.WalletRepository();
        this.notifRepo = new notification_repository_1.NotificationRepository();
        this.auditRepo = new audit_log_repository_1.AuditLogRepository();
    }
    // Validate Tunisian 8-digit phone numbers (starts with 2, 4, 5, or 9)
    static isValidTunisianPhone(phone) {
        const cleaned = phone.replace(/[\s-]/g, '');
        return /^(2|4|5|9)[0-9]{7}$/.test(cleaned);
    }
    // Generate readable Order Number: KG-YYYYMMDD-XXXXXX
    generateOrderNumber() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
        return `KG-${yyyy}${mm}${dd}-${randomHex}`;
    }
    async createOrder(clientId, packId, beneficiaryNumber) {
        const cleanedPhone = beneficiaryNumber.replace(/[\s-]/g, '');
        if (!OrderService.isValidTunisianPhone(cleanedPhone)) {
            throw new errors_1.AppError('رقم الهاتف غير صالح. يجب أن يتكون من 8 أرقام ويبدأ بـ (2 أو 4 أو 5 أو 9)', 400, types_1.ErrorCode.VALIDATION_ERROR);
        }
        const pack = await this.packRepo.findById(packId);
        if (!pack) {
            throw new errors_1.NotFoundError('الباقة غير موجودة', types_1.ErrorCode.PACK_NOT_FOUND);
        }
        if (!pack.isActive) {
            throw new errors_1.AppError('هذه الباقة غير متاحة حالياً', 400, types_1.ErrorCode.PACK_DISABLED);
        }
        const network = await this.networkRepo.findById(pack.networkId._id ? pack.networkId._id.toString() : pack.networkId.toString());
        if (!network || !network.isActive) {
            throw new errors_1.AppError('هذه الشبكة غير متاحة حالياً', 400, types_1.ErrorCode.NETWORK_DISABLED);
        }
        return (0, transaction_util_1.runInTransaction)(async (session) => {
            // 1. Verify User and status
            const user = await this.userRepo.findById(clientId, session);
            if (!user) {
                throw new errors_1.NotFoundError('العميل غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
            }
            if (user.status !== types_1.UserStatus.ACTIVE) {
                throw new errors_1.ForbiddenError('حسابك غير مفعل لإتمام الطلبات', types_1.ErrorCode.ACCOUNT_PENDING);
            }
            // 2. Track debt
            const debtBefore = user.debt || 0;
            const updatedUser = await this.userRepo.updateDebt(clientId, pack.price, session);
            const debtAfter = updatedUser ? (updatedUser.debt || 0) : Math.round((debtBefore + pack.price) * 1000) / 1000;
            // 3. Create Order
            const orderNumber = this.generateOrderNumber();
            const order = await this.orderRepo.create({
                orderNumber,
                clientId: new mongoose_1.Types.ObjectId(clientId),
                packId: new mongoose_1.Types.ObjectId(pack._id.toString()),
                networkId: new mongoose_1.Types.ObjectId(network._id.toString()),
                beneficiaryNumber: cleanedPhone,
                packNameSnapshot: pack.name,
                networkNameSnapshot: network.name,
                dataAmountSnapshot: pack.dataAmount,
                price: pack.price,
                status: types_1.OrderStatus.PENDING,
                timeline: [
                    {
                        status: types_1.OrderStatus.PENDING,
                        message: `تم إنشاء الطلب وتقييد ${pack.price.toFixed(3)} د.ت كدين على الحساب`,
                        actorType: 'CLIENT',
                        actorId: clientId,
                        createdAt: new Date()
                    }
                ]
            }, session);
            // 4. Create Wallet Transaction for the debt purchase
            const transactionId = `TX-${Date.now()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
            const financialOpId = `ORDER_PURCHASE_${order._id.toString()}`;
            await this.walletRepo.createTransaction({
                transactionId,
                financialOperationId: financialOpId,
                userId: new mongoose_1.Types.ObjectId(clientId),
                orderId: new mongoose_1.Types.ObjectId(order._id.toString()),
                type: types_1.WalletTransactionType.CHARGE,
                amount: pack.price,
                balanceBefore: debtBefore,
                balanceAfter: debtAfter,
                description: `شراء باقة ${pack.name} (${pack.dataAmount}) للرقم ${cleanedPhone} - قيد دين`,
                reference: orderNumber
            }, session);
            // 6. Create Notification for client
            const notification = await this.notifRepo.create({
                userId: new mongoose_1.Types.ObjectId(clientId),
                title: 'طلب شحن جديد',
                message: `تم استلام طلب شحن ${pack.name} للرقم ${cleanedPhone} بنجاح برقم ${orderNumber}.`,
                type: types_1.NotificationType.ORDER_CREATED,
                metadata: { orderId: order._id.toString(), orderNumber }
            }, session);
            // 7. Emit real-time events
            socket_service_1.SocketEmitter.emitToUser(clientId, 'user.debt_updated', { debt: debtAfter });
            socket_service_1.SocketEmitter.emitToUser(clientId, 'wallet.updated', { debt: debtAfter });
            socket_service_1.SocketEmitter.emitToUser(clientId, 'order.created', order);
            socket_service_1.SocketEmitter.emitToUser(clientId, 'notification.created', notification);
            socket_service_1.SocketEmitter.emitToAdmin('order.created', { order, client: { fullName: user.fullName, username: user.username } });
            return order;
        });
    }
    async clientCancelOrder(orderId, clientId) {
        return (0, transaction_util_1.runInTransaction)(async (session) => {
            const order = await this.orderRepo.findById(orderId, session);
            if (!order) {
                throw new errors_1.NotFoundError('الطلب غير موجود', types_1.ErrorCode.ORDER_NOT_FOUND);
            }
            if (order.clientId._id.toString() !== clientId && order.clientId.toString() !== clientId) {
                throw new errors_1.ForbiddenError('لا يمكنك إلغاء طلب لا يخصك', types_1.ErrorCode.FORBIDDEN);
            }
            if (order.status === types_1.OrderStatus.CANCELLED) {
                throw new errors_1.AppError('تم إلغاء هذا الطلب مسبقاً', 400, types_1.ErrorCode.ORDER_ALREADY_CANCELLED);
            }
            if (order.status !== types_1.OrderStatus.PENDING) {
                throw new errors_1.AppError('لا يمكن إلغاء الطلب بعد تأكيده أو البدء في تنفيذه', 400, types_1.ErrorCode.ORDER_CANNOT_BE_CANCELLED);
            }
            // Check double-refund protection
            const refundOpId = `REFUND_ORDER_${order._id.toString()}`;
            const existingRefund = await this.walletRepo.findByFinancialOperationId(refundOpId, session);
            if (existingRefund) {
                throw new errors_1.AppError('تم استرجاع مبلغ هذا الطلب مسبقاً', 400, types_1.ErrorCode.ORDER_ALREADY_CANCELLED);
            }
            // Refund user balance atomically
            const user = await this.userRepo.findById(clientId, session);
            if (!user) {
                throw new errors_1.NotFoundError('العميل غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
            }
            const debtBefore = user.debt || 0;
            const updatedUser = await this.userRepo.updateDebt(clientId, -order.price, session);
            const debtAfter = updatedUser ? (updatedUser.debt || 0) : Math.max(0, Math.round((debtBefore - order.price) * 1000) / 1000);
            // Update Order Status
            order.status = types_1.OrderStatus.CANCELLED;
            order.cancelledAt = new Date();
            order.timeline.push({
                status: types_1.OrderStatus.CANCELLED,
                message: `تم إلغاء الطلب من قبل العميل وخصم ${order.price.toFixed(3)} د.ت من الدين`,
                actorType: 'CLIENT',
                actorId: clientId,
                createdAt: new Date()
            });
            await order.save({ session });
            // Create Refund Transaction
            const transactionId = `TX-${Date.now()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
            await this.walletRepo.createTransaction({
                transactionId,
                financialOperationId: refundOpId,
                userId: new mongoose_1.Types.ObjectId(clientId),
                orderId: new mongoose_1.Types.ObjectId(order._id.toString()),
                type: types_1.WalletTransactionType.REFUND,
                amount: -order.price,
                balanceBefore: debtBefore,
                balanceAfter: debtAfter,
                description: `خصم قيمة الطلب الملغى ${order.orderNumber} من الدين`,
                reference: order.orderNumber
            }, session);
            // Notification
            const notif = await this.notifRepo.create({
                userId: new mongoose_1.Types.ObjectId(clientId),
                title: 'إلغاء الطلب وتعديل الدين',
                message: `تم إلغاء طلبك ${order.orderNumber} وخصم مبلغ ${order.price.toFixed(3)} د.ت من دينك. دينك الحالي: ${debtAfter.toFixed(3)} د.ت`,
                type: types_1.NotificationType.ORDER_CANCELLED,
                metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
            }, session);
            // Realtime
            socket_service_1.SocketEmitter.emitToUser(clientId, 'user.debt_updated', { debt: debtAfter });
            socket_service_1.SocketEmitter.emitToUser(clientId, 'wallet.updated', { debt: debtAfter });
            socket_service_1.SocketEmitter.emitToUser(clientId, 'order.cancelled', order);
            socket_service_1.SocketEmitter.emitToUser(clientId, 'order.updated', order);
            socket_service_1.SocketEmitter.emitToUser(clientId, 'notification.created', notif);
            socket_service_1.SocketEmitter.emitToAdmin('order.updated', order);
            return order;
        });
    }
    async adminConfirmOrder(orderId, adminId) {
        const order = await this.orderRepo.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('الطلب غير موجود', types_1.ErrorCode.ORDER_NOT_FOUND);
        }
        if (order.status !== types_1.OrderStatus.PENDING) {
            throw new errors_1.AppError(`لا يمكن تأكيد الطلب من الحالة الحالية (${order.status})`, 400, types_1.ErrorCode.INVALID_STATUS_TRANSITION);
        }
        order.status = types_1.OrderStatus.CONFIRMED;
        order.confirmedAt = new Date();
        order.timeline.push({
            status: types_1.OrderStatus.CONFIRMED,
            message: 'تمت مراجعة وتأكيد الطلب من قبل الإدارة',
            actorType: 'ADMIN',
            actorId: adminId,
            createdAt: new Date()
        });
        await order.save();
        await this.auditRepo.create({
            adminId: new mongoose_1.Types.ObjectId(adminId),
            action: types_1.AuditAction.ORDER_CONFIRMED,
            entityType: 'Order',
            entityId: order._id.toString(),
            metadata: { orderNumber: order.orderNumber, status: order.status }
        });
        const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
        const notif = await this.notifRepo.create({
            userId: new mongoose_1.Types.ObjectId(clientId),
            title: 'تم تأكيد طلبك',
            message: `تم تأكيد طلب الشحن ${order.orderNumber} وجاري الاستعداد للتنفيذ.`,
            type: types_1.NotificationType.ORDER_CONFIRMED,
            metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
        });
        socket_service_1.SocketEmitter.emitToUser(clientId, 'order.confirmed', order);
        socket_service_1.SocketEmitter.emitToUser(clientId, 'order.updated', order);
        socket_service_1.SocketEmitter.emitToUser(clientId, 'notification.created', notif);
        socket_service_1.SocketEmitter.emitToAdmin('order.updated', order);
        return order;
    }
    async adminProcessOrder(orderId, adminId) {
        const order = await this.orderRepo.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('الطلب غير موجود', types_1.ErrorCode.ORDER_NOT_FOUND);
        }
        if (order.status !== types_1.OrderStatus.CONFIRMED && order.status !== types_1.OrderStatus.PENDING) {
            throw new errors_1.AppError(`لا يمكن نقل الطلب إلى قيد التنفيذ من الحالة الحالية (${order.status})`, 400, types_1.ErrorCode.INVALID_STATUS_TRANSITION);
        }
        order.status = types_1.OrderStatus.PROCESSING;
        order.processedAt = new Date();
        order.timeline.push({
            status: types_1.OrderStatus.PROCESSING,
            message: `جاري شحن الباقة للرقم ${order.beneficiaryNumber}`,
            actorType: 'ADMIN',
            actorId: adminId,
            createdAt: new Date()
        });
        await order.save();
        await this.auditRepo.create({
            adminId: new mongoose_1.Types.ObjectId(adminId),
            action: types_1.AuditAction.ORDER_STATUS_CHANGED,
            entityType: 'Order',
            entityId: order._id.toString(),
            metadata: { orderNumber: order.orderNumber, status: order.status }
        });
        const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
        const notif = await this.notifRepo.create({
            userId: new mongoose_1.Types.ObjectId(clientId),
            title: 'طلبك قيد الشحن',
            message: `بدأت عملية شحن الرصيد للرقم ${order.beneficiaryNumber}.`,
            type: types_1.NotificationType.ORDER_PROCESSING,
            metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
        });
        socket_service_1.SocketEmitter.emitToUser(clientId, 'order.processing', order);
        socket_service_1.SocketEmitter.emitToUser(clientId, 'order.updated', order);
        socket_service_1.SocketEmitter.emitToUser(clientId, 'notification.created', notif);
        socket_service_1.SocketEmitter.emitToAdmin('order.updated', order);
        return order;
    }
    async adminCompleteOrder(orderId, adminId) {
        const order = await this.orderRepo.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('الطلب غير موجود', types_1.ErrorCode.ORDER_NOT_FOUND);
        }
        if (order.status !== types_1.OrderStatus.PROCESSING && order.status !== types_1.OrderStatus.CONFIRMED) {
            throw new errors_1.AppError(`لا يمكن إكمال الطلب من الحالة الحالية (${order.status})`, 400, types_1.ErrorCode.INVALID_STATUS_TRANSITION);
        }
        order.status = types_1.OrderStatus.COMPLETED;
        order.completedAt = new Date();
        order.timeline.push({
            status: types_1.OrderStatus.COMPLETED,
            message: `تم شحن الباقة بنجاح للرقم ${order.beneficiaryNumber}`,
            actorType: 'ADMIN',
            actorId: adminId,
            createdAt: new Date()
        });
        await order.save();
        await this.auditRepo.create({
            adminId: new mongoose_1.Types.ObjectId(adminId),
            action: types_1.AuditAction.ORDER_STATUS_CHANGED,
            entityType: 'Order',
            entityId: order._id.toString(),
            metadata: { orderNumber: order.orderNumber, status: order.status }
        });
        const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
        const notif = await this.notifRepo.create({
            userId: new mongoose_1.Types.ObjectId(clientId),
            title: 'تم الشحن بنجاح! 🚀',
            message: `تم شحن باقة ${order.packNameSnapshot} للرقم ${order.beneficiaryNumber} بنجاح. شكراً لثقتكم بنا!`,
            type: types_1.NotificationType.ORDER_COMPLETED,
            metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
        });
        socket_service_1.SocketEmitter.emitToUser(clientId, 'order.completed', order);
        socket_service_1.SocketEmitter.emitToUser(clientId, 'order.updated', order);
        socket_service_1.SocketEmitter.emitToUser(clientId, 'notification.created', notif);
        socket_service_1.SocketEmitter.emitToAdmin('order.updated', order);
        return order;
    }
    async adminRejectOrder(orderId, adminId, reason) {
        return (0, transaction_util_1.runInTransaction)(async (session) => {
            const order = await this.orderRepo.findById(orderId, session);
            if (!order) {
                throw new errors_1.NotFoundError('الطلب غير موجود', types_1.ErrorCode.ORDER_NOT_FOUND);
            }
            if (order.status === types_1.OrderStatus.COMPLETED ||
                order.status === types_1.OrderStatus.CANCELLED ||
                order.status === types_1.OrderStatus.REJECTED) {
                throw new errors_1.AppError(`لا يمكن رفض الطلب وهو في الحالة (${order.status})`, 400, types_1.ErrorCode.INVALID_STATUS_TRANSITION);
            }
            // Check double-refund protection
            const refundOpId = `REFUND_ORDER_${order._id.toString()}`;
            const existingRefund = await this.walletRepo.findByFinancialOperationId(refundOpId, session);
            const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
            const user = await this.userRepo.findById(clientId, session);
            if (!user) {
                throw new errors_1.NotFoundError('العميل غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
            }
            // If refund hasn't happened yet, perform debt refund
            let debtAfter = user.debt || 0;
            if (!existingRefund) {
                const debtBefore = user.debt || 0;
                const updatedUser = await this.userRepo.updateDebt(clientId, -order.price, session);
                debtAfter = updatedUser ? (updatedUser.debt || 0) : Math.max(0, Math.round((debtBefore - order.price) * 1000) / 1000);
                const transactionId = `TX-${Date.now()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
                await this.walletRepo.createTransaction({
                    transactionId,
                    financialOperationId: refundOpId,
                    userId: new mongoose_1.Types.ObjectId(clientId),
                    adminId: new mongoose_1.Types.ObjectId(adminId),
                    orderId: new mongoose_1.Types.ObjectId(order._id.toString()),
                    type: types_1.WalletTransactionType.REFUND,
                    amount: -order.price,
                    balanceBefore: debtBefore,
                    balanceAfter: debtAfter,
                    description: `خصم قيمة الطلب المرفوض ${order.orderNumber} من الدين ${reason ? `(السبب: ${reason})` : ''}`,
                    reference: order.orderNumber
                }, session);
            }
            // Update Order Status
            order.status = types_1.OrderStatus.REJECTED;
            order.rejectedAt = new Date();
            order.timeline.push({
                status: types_1.OrderStatus.REJECTED,
                message: `تم رفض الطلب من قبل الإدارة ${reason ? `(${reason})` : ''} وخصم ${order.price.toFixed(3)} د.ت من الدين`,
                actorType: 'ADMIN',
                actorId: adminId,
                createdAt: new Date()
            });
            await order.save({ session });
            // Audit Log
            await this.auditRepo.create({
                adminId: new mongoose_1.Types.ObjectId(adminId),
                action: types_1.AuditAction.ORDER_REJECTED,
                entityType: 'Order',
                entityId: order._id.toString(),
                metadata: { orderNumber: order.orderNumber, reason }
            });
            // Notification
            const notif = await this.notifRepo.create({
                userId: new mongoose_1.Types.ObjectId(clientId),
                title: 'تم رفض طلب الشحن وتعديل الدين',
                message: `تم رفض طلبك ${order.orderNumber}. تم خصم ${order.price.toFixed(3)} د.ت من دينك. دينك الحالي: ${debtAfter.toFixed(3)} د.ت`,
                type: types_1.NotificationType.ORDER_REJECTED,
                metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber, reason }
            }, session);
            socket_service_1.SocketEmitter.emitToUser(clientId, 'user.debt_updated', { debt: debtAfter });
            socket_service_1.SocketEmitter.emitToUser(clientId, 'wallet.updated', { debt: debtAfter });
            socket_service_1.SocketEmitter.emitToUser(clientId, 'order.rejected', order);
            socket_service_1.SocketEmitter.emitToUser(clientId, 'order.updated', order);
            socket_service_1.SocketEmitter.emitToUser(clientId, 'notification.created', notif);
            socket_service_1.SocketEmitter.emitToAdmin('order.updated', order);
            return order;
        });
    }
    async getClientOrders(clientId, page = 1, limit = 20, status) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter = { clientId: new mongoose_1.Types.ObjectId(clientId) };
        if (status) {
            filter.status = status;
        }
        return this.orderRepo.findWithPagination(filter, page, limit);
    }
    async getOrderById(orderId, requestingUserId, isAdmin = false) {
        const order = await this.orderRepo.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('الطلب غير موجود', types_1.ErrorCode.ORDER_NOT_FOUND);
        }
        if (!isAdmin && requestingUserId) {
            const orderClientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
            if (orderClientId !== requestingUserId) {
                throw new errors_1.ForbiddenError('لا يمكنك عرض تفاصيل هذا الطلب', types_1.ErrorCode.FORBIDDEN);
            }
        }
        return order;
    }
    async getAdminOrders(params) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter = {};
        if (params.status) {
            filter.status = params.status;
        }
        if (params.networkId) {
            filter.networkId = new mongoose_1.Types.ObjectId(params.networkId);
        }
        if (params.search) {
            const searchRegex = new RegExp(params.search.trim(), 'i');
            filter.$or = [
                { orderNumber: searchRegex },
                { beneficiaryNumber: searchRegex }
            ];
        }
        if (params.dateFrom || params.dateTo) {
            filter.createdAt = {};
            if (params.dateFrom) {
                filter.createdAt.$gte = new Date(params.dateFrom);
            }
            if (params.dateTo) {
                const to = new Date(params.dateTo);
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }
        return this.orderRepo.findWithPagination(filter, page, limit);
    }
}
exports.OrderService = OrderService;
