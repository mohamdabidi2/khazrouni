import { Types } from 'mongoose';
import { UserRepository } from '../repositories/user.repository';
import { OrderRepository } from '../repositories/order.repository';
import { NetworkRepository } from '../repositories/network.repository';
import { AnnouncementRepository } from '../repositories/announcement.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PackRepository } from '../repositories/pack.repository';
import {
  UserRole,
  UserStatus,
  OrderStatus,
  NotificationType,
  AuditAction,
  ErrorCode
} from '../types';
import { NotFoundError, AppError } from '../utils/errors';
import { SocketEmitter } from '../sockets/socket.service';
import { FcmEmitter } from './fcm.service';


export class UserService {
  private userRepo: UserRepository;
  private orderRepo: OrderRepository;
  private networkRepo: NetworkRepository;
  private packRepo: PackRepository;
  private announcementRepo: AnnouncementRepository;
  private notifRepo: NotificationRepository;
  private auditRepo: AuditLogRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.orderRepo = new OrderRepository();
    this.networkRepo = new NetworkRepository();
    this.packRepo = new PackRepository();
    this.announcementRepo = new AnnouncementRepository();
    this.notifRepo = new NotificationRepository();
    this.auditRepo = new AuditLogRepository();
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود', ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  async getClientDashboard(clientId: string) {
    const [user, networks, recentOrders, announcement, unreadCount, packCounts] = await Promise.all([
      this.userRepo.findById(clientId),
      this.networkRepo.findAll(true),
      this.orderRepo.getRecentOrders(clientId, 5),
      this.announcementRepo.findLatestActive(),
      this.notifRepo.getUnreadCount(clientId),
      this.packRepo.countByNetwork()
    ]);

    if (!user) {
      throw new NotFoundError('المستخدم غير موجود', ErrorCode.USER_NOT_FOUND);
    }

    const countMap = new Map<string, number>();
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

    const [
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
    ] = await Promise.all([
      this.userRepo.count({ role: UserRole.CLIENT }),
      this.userRepo.count({ role: UserRole.CLIENT, status: UserStatus.PENDING }),
      this.userRepo.count({ role: UserRole.CLIENT, status: UserStatus.ACTIVE }),
      this.userRepo.count({ role: UserRole.CLIENT, status: UserStatus.BLOCKED }),
      this.orderRepo.count(),
      this.orderRepo.count({ status: OrderStatus.PENDING }),
      this.orderRepo.count({ status: OrderStatus.COMPLETED }),
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

  async listUsers(params: {
    page?: number;
    limit?: number;
    status?: UserStatus;
    role?: UserRole;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

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

  async updateUserStatus(params: {
    targetUserId: string;
    adminId: string;
    newStatus: UserStatus;
    ip?: string;
    userAgent?: string;
  }) {
    const { targetUserId, adminId, newStatus, ip, userAgent } = params;

    const user = await this.userRepo.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود', ErrorCode.USER_NOT_FOUND);
    }

    if (user.role === UserRole.ADMIN) {
      throw new AppError('لا يمكن تعديل حالة مدير النظام', 400, ErrorCode.FORBIDDEN);
    }

    const oldStatus = user.status;
    user.status = newStatus;
    await user.save();

    let action: AuditAction;
    let notifTitle = 'تحديث حالة الحساب';
    let notifMsg = `تم تغيير حالة حسابك إلى: ${newStatus}`;
    let notifType = NotificationType.SYSTEM;

    switch (newStatus) {
      case UserStatus.ACTIVE:
        action = AuditAction.USER_APPROVED;
        notifTitle = 'تم تفعيل حسابك بنجاح! 🎉';
        notifMsg = 'تم قبول وتفعيل حسابك من قبل الإدارة. يمكنك الآن شحن رصيدك واستخدام كافة خدمات التطبيق.';
        notifType = NotificationType.ACCOUNT_APPROVED;
        break;
      case UserStatus.REJECTED:
        action = AuditAction.USER_REJECTED;
        notifTitle = 'رفض طلب الحساب';
        notifMsg = 'تم رفض طلب إنشاء الحساب من قبل الإدارة.';
        notifType = NotificationType.ACCOUNT_REJECTED;
        break;
      case UserStatus.BLOCKED:
        action = AuditAction.USER_BLOCKED;
        notifTitle = 'تم إيقاف حسابك';
        notifMsg = 'تم حظر وتجميد حسابك من قبل إدارة النظام.';
        notifType = NotificationType.SYSTEM;
        break;
      default:
        action = AuditAction.USER_UNBLOCKED;
        break;
    }

    // Audit Log
    await this.auditRepo.create({
      adminId: new Types.ObjectId(adminId),
      action,
      entityType: 'User',
      entityId: targetUserId,
      metadata: { oldStatus, newStatus, username: user.username },
      ip,
      userAgent
    });

    // Create Notification
    const notif = await this.notifRepo.create({
      userId: new Types.ObjectId(targetUserId),
      title: notifTitle,
      message: notifMsg,
      type: notifType
    });

    // Realtime events
    SocketEmitter.emitToUser(targetUserId, 'user.status_changed', { status: newStatus, oldStatus });
    SocketEmitter.emitToUser(targetUserId, 'notification.created', notif);
    if (newStatus === UserStatus.ACTIVE) {
      SocketEmitter.emitToUser(targetUserId, 'user.approved', { user });
    }
    // FCM
    FcmEmitter.emitToUser(targetUserId, notif.title, notif.message).catch(() => {});


    return user;
  }

  async getAdminUserDetails(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('العميل غير موجود', ErrorCode.USER_NOT_FOUND);
    }

    const [totalOrders, completedOrders, pendingOrders, cancelledOrders, rejectedOrders] = await Promise.all([
      this.orderRepo.count({ clientId: user._id }),
      this.orderRepo.count({ clientId: user._id, status: OrderStatus.COMPLETED }),
      this.orderRepo.count({ clientId: user._id, status: OrderStatus.PENDING }),
      this.orderRepo.count({ clientId: user._id, status: OrderStatus.CANCELLED }),
      this.orderRepo.count({ clientId: user._id, status: OrderStatus.REJECTED })
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
