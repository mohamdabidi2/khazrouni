"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const mongoose_1 = require("mongoose");
const user_repository_1 = require("../repositories/user.repository");
const order_repository_1 = require("../repositories/order.repository");
const network_repository_1 = require("../repositories/network.repository");
const announcement_repository_1 = require("../repositories/announcement.repository");
const notification_repository_1 = require("../repositories/notification.repository");
const audit_log_repository_1 = require("../repositories/audit-log.repository");
const pack_repository_1 = require("../repositories/pack.repository");
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const socket_service_1 = require("../sockets/socket.service");
const fcm_service_1 = require("./fcm.service");
class UserService {
    userRepo;
    orderRepo;
    networkRepo;
    packRepo;
    announcementRepo;
    notifRepo;
    auditRepo;
    constructor() {
        this.userRepo = new user_repository_1.UserRepository();
        this.orderRepo = new order_repository_1.OrderRepository();
        this.networkRepo = new network_repository_1.NetworkRepository();
        this.packRepo = new pack_repository_1.PackRepository();
        this.announcementRepo = new announcement_repository_1.AnnouncementRepository();
        this.notifRepo = new notification_repository_1.NotificationRepository();
        this.auditRepo = new audit_log_repository_1.AuditLogRepository();
    }
    async getProfile(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('المستخدم غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }
    async getClientDashboard(clientId) {
        const [user, networks, recentOrders, announcement, unreadCount, packCounts] = await Promise.all([
            this.userRepo.findById(clientId),
            this.networkRepo.findAll(true),
            this.orderRepo.getRecentOrders(clientId, 5),
            this.announcementRepo.findLatestActive(),
            this.notifRepo.getUnreadCount(clientId),
            this.packRepo.countByNetwork()
        ]);
        if (!user) {
            throw new errors_1.NotFoundError('المستخدم غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        const countMap = new Map();
        packCounts.forEach(pc => countMap.set(pc.networkId.toString(), pc.count));
        const networksWithCounts = networks.map(n => ({
            ...n.toJSON(),
            packsCount: countMap.get(n._id.toString()) || 0
        }));
        return {
            user: {
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                role: user.role,
                status: user.status,
                balance: user.balance,
                debt: user.debt || 0,
                createdAt: user.createdAt
            },
            balance: user.balance,
            debt: user.debt || 0,
            networks: networksWithCounts,
            recentOrders,
            announcements: announcement ? [announcement] : [],
            unreadNotifications: unreadCount
        };
    }
    async getAdminDashboard() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalClients, pendingClients, activeClients, blockedClients, totalOrders, pendingOrders, completedOrders, todayOrders, todayRevenue, totalRevenue, totalClientsBalance, totalClientsDebt, recentOrders] = await Promise.all([
            this.userRepo.count({ role: types_1.UserRole.CLIENT }),
            this.userRepo.count({ role: types_1.UserRole.CLIENT, status: types_1.UserStatus.PENDING }),
            this.userRepo.count({ role: types_1.UserRole.CLIENT, status: types_1.UserStatus.ACTIVE }),
            this.userRepo.count({ role: types_1.UserRole.CLIENT, status: types_1.UserStatus.BLOCKED }),
            this.orderRepo.count(),
            this.orderRepo.count({ status: types_1.OrderStatus.PENDING }),
            this.orderRepo.count({ status: types_1.OrderStatus.COMPLETED }),
            this.orderRepo.count({ createdAt: { $gte: today } }),
            this.orderRepo.getTodayRevenue(),
            this.orderRepo.getTotalRevenue(),
            this.userRepo.getTotalClientsBalance(),
            this.userRepo.getTotalClientsDebt(),
            this.orderRepo.getRecentOrders(undefined, 8)
        ]);
        return {
            totalClients,
            pendingClients,
            activeClients,
            blockedClients,
            totalOrders,
            pendingOrders,
            completedOrders,
            todayOrders,
            todayRevenue,
            totalRevenue,
            totalClientsBalance,
            totalClientsDebt,
            recentOrders
        };
    }
    async listUsers(params) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter = {};
        if (params.status) {
            filter.status = params.status;
        }
        if (params.role) {
            filter.role = params.role;
        }
        if (params.search) {
            const searchRegex = new RegExp(params.search.trim(), 'i');
            filter.$or = [{ username: searchRegex }, { fullName: searchRegex }];
        }
        return this.userRepo.findWithPagination(filter, page, limit);
    }
    async updateUserStatus(params) {
        const { targetUserId, adminId, newStatus, ip, userAgent } = params;
        const user = await this.userRepo.findById(targetUserId);
        if (!user) {
            throw new errors_1.NotFoundError('المستخدم غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        if (user.role === types_1.UserRole.ADMIN) {
            throw new errors_1.AppError('لا يمكن تعديل حالة مدير النظام', 400, types_1.ErrorCode.FORBIDDEN);
        }
        const oldStatus = user.status;
        user.status = newStatus;
        await user.save();
        let action;
        let notifTitle = 'تحديث حالة الحساب';
        let notifMsg = `تم تغيير حالة حسابك إلى: ${newStatus}`;
        let notifType = types_1.NotificationType.SYSTEM;
        switch (newStatus) {
            case types_1.UserStatus.ACTIVE:
                action = types_1.AuditAction.USER_APPROVED;
                notifTitle = 'تم تفعيل حسابك بنجاح! 🎉';
                notifMsg = 'تم قبول وتفعيل حسابك من قبل الإدارة. يمكنك الآن شحن رصيدك واستخدام كافة خدمات التطبيق.';
                notifType = types_1.NotificationType.ACCOUNT_APPROVED;
                break;
            case types_1.UserStatus.REJECTED:
                action = types_1.AuditAction.USER_REJECTED;
                notifTitle = 'رفض طلب الحساب';
                notifMsg = 'تم رفض طلب إنشاء الحساب من قبل الإدارة.';
                notifType = types_1.NotificationType.ACCOUNT_REJECTED;
                break;
            case types_1.UserStatus.BLOCKED:
                action = types_1.AuditAction.USER_BLOCKED;
                notifTitle = 'تم إيقاف حسابك';
                notifMsg = 'تم حظر وتجميد حسابك من قبل إدارة النظام.';
                notifType = types_1.NotificationType.SYSTEM;
                break;
            default:
                action = types_1.AuditAction.USER_UNBLOCKED;
                break;
        }
        // Audit Log
        await this.auditRepo.create({
            adminId: new mongoose_1.Types.ObjectId(adminId),
            action,
            entityType: 'User',
            entityId: targetUserId,
            metadata: { oldStatus, newStatus, username: user.username },
            ip,
            userAgent
        });
        // Create Notification
        const notif = await this.notifRepo.create({
            userId: new mongoose_1.Types.ObjectId(targetUserId),
            title: notifTitle,
            message: notifMsg,
            type: notifType
        });
        // Realtime events
        socket_service_1.SocketEmitter.emitToUser(targetUserId, 'user.status_changed', { status: newStatus, oldStatus });
        socket_service_1.SocketEmitter.emitToUser(targetUserId, 'notification.created', notif);
        if (newStatus === types_1.UserStatus.ACTIVE) {
            socket_service_1.SocketEmitter.emitToUser(targetUserId, 'user.approved', { user });
        }
        // FCM
        fcm_service_1.FcmEmitter.emitToUser(targetUserId, notif.title, notif.message).catch(() => { });
        return user;
    }
    async getAdminUserDetails(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('العميل غير موجود', types_1.ErrorCode.USER_NOT_FOUND);
        }
        const [totalOrders, completedOrders, pendingOrders, cancelledOrders, rejectedOrders] = await Promise.all([
            this.orderRepo.count({ clientId: user._id }),
            this.orderRepo.count({ clientId: user._id, status: types_1.OrderStatus.COMPLETED }),
            this.orderRepo.count({ clientId: user._id, status: types_1.OrderStatus.PENDING }),
            this.orderRepo.count({ clientId: user._id, status: types_1.OrderStatus.CANCELLED }),
            this.orderRepo.count({ clientId: user._id, status: types_1.OrderStatus.REJECTED })
        ]);
        return {
            user,
            stats: {
                totalOrders,
                completedOrders,
                pendingOrders,
                cancelledOrders,
                rejectedOrders
            }
        };
    }
}
exports.UserService = UserService;
