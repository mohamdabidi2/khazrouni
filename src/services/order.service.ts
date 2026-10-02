import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { OrderRepository } from '../repositories/order.repository';
import { PackRepository } from '../repositories/pack.repository';
import { NetworkRepository } from '../repositories/network.repository';
import { UserRepository } from '../repositories/user.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import {
  OrderStatus,
  WalletTransactionType,
  NotificationType,
  UserStatus,
  AuditAction,
  ErrorCode
} from '../types';
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  InsufficientBalanceError
} from '../utils/errors';
import { runInTransaction } from '../utils/transaction.util';
import { SocketEmitter } from '../sockets/socket.service';

export class OrderService {
  private orderRepo: OrderRepository;
  private packRepo: PackRepository;
  private networkRepo: NetworkRepository;
  private userRepo: UserRepository;
  private walletRepo: WalletRepository;
  private notifRepo: NotificationRepository;
  private auditRepo: AuditLogRepository;

  constructor() {
    this.orderRepo = new OrderRepository();
    this.packRepo = new PackRepository();
    this.networkRepo = new NetworkRepository();
    this.userRepo = new UserRepository();
    this.walletRepo = new WalletRepository();
    this.notifRepo = new NotificationRepository();
    this.auditRepo = new AuditLogRepository();
  }

  // Validate Tunisian 8-digit phone numbers (starts with 2, 4, 5, or 9)
  static isValidTunisianPhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s-]/g, '');
    return /^(2|4|5|9)[0-9]{7}$/.test(cleaned);
  }

  // Generate readable Order Number: KG-YYYYMMDD-XXXXXX
  private generateOrderNumber(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    return `KG-${yyyy}${mm}${dd}-${randomHex}`;
  }

  async createOrder(clientId: string, packId: string, beneficiaryNumber: string) {
    const cleanedPhone = beneficiaryNumber.replace(/[\s-]/g, '');
    if (!OrderService.isValidTunisianPhone(cleanedPhone)) {
      throw new AppError('رقم الهاتف غير صالح. يجب أن يتكون من 8 أرقام ويبدأ بـ (2 أو 4 أو 5 أو 9)', 400, ErrorCode.VALIDATION_ERROR);
    }

    const pack = await this.packRepo.findById(packId);
    if (!pack) {
      throw new NotFoundError('الباقة غير موجودة', ErrorCode.PACK_NOT_FOUND);
    }
    if (!pack.isActive) {
      throw new AppError('هذه الباقة غير متاحة حالياً', 400, ErrorCode.PACK_DISABLED);
    }

    const network = await this.networkRepo.findById(pack.networkId._id ? pack.networkId._id.toString() : pack.networkId.toString());
    if (!network || !network.isActive) {
      throw new AppError('هذه الشبكة غير متاحة حالياً', 400, ErrorCode.NETWORK_DISABLED);
    }

    return runInTransaction(async (session) => {
      // 1. Verify User and status
      const user = await this.userRepo.findById(clientId, session);
      if (!user) {
        throw new NotFoundError('العميل غير موجود', ErrorCode.USER_NOT_FOUND);
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenError('حسابك غير مفعل لإتمام الطلبات', ErrorCode.ACCOUNT_PENDING);
      }

      // 2. Track debt
      const debtBefore = user.debt || 0;
      const updatedUser = await this.userRepo.updateDebt(clientId, pack.price, session);
      const debtAfter = updatedUser ? (updatedUser.debt || 0) : Math.round((debtBefore + pack.price) * 1000) / 1000;

      // 3. Create Order
      const orderNumber = this.generateOrderNumber();
      const order = await this.orderRepo.create(
        {
          orderNumber,
          clientId: new Types.ObjectId(clientId),
          packId: new Types.ObjectId(pack._id.toString()),
          networkId: new Types.ObjectId(network._id.toString()),
          beneficiaryNumber: cleanedPhone,
          packNameSnapshot: pack.name,
          networkNameSnapshot: network.name,
          dataAmountSnapshot: pack.dataAmount,
          price: pack.price,
          status: OrderStatus.PENDING,
          timeline: [
            {
              status: OrderStatus.PENDING,
              message: `تم إنشاء الطلب وتقييد ${pack.price.toFixed(3)} د.ت كدين على الحساب`,
              actorType: 'CLIENT',
              actorId: clientId,
              createdAt: new Date()
            }
          ]
        },
        session
      );

      // 4. Create Wallet Transaction for the debt purchase
      const transactionId = `TX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      const financialOpId = `ORDER_PURCHASE_${order._id.toString()}`;

      await this.walletRepo.createTransaction(
        {
          transactionId,
          financialOperationId: financialOpId,
          userId: new Types.ObjectId(clientId),
          orderId: new Types.ObjectId(order._id.toString()),
          type: WalletTransactionType.CHARGE,
          amount: pack.price,
          balanceBefore: debtBefore,
          balanceAfter: debtAfter,
          description: `شراء باقة ${pack.name} (${pack.dataAmount}) للرقم ${cleanedPhone} - قيد دين`,
          reference: orderNumber
        },
        session
      );

      // 6. Create Notification for client
      const notification = await this.notifRepo.create(
        {
          userId: new Types.ObjectId(clientId),
          title: 'طلب شحن جديد',
          message: `تم استلام طلب شحن ${pack.name} للرقم ${cleanedPhone} بنجاح برقم ${orderNumber}.`,
          type: NotificationType.ORDER_CREATED,
          metadata: { orderId: order._id.toString(), orderNumber }
        },
        session
      );

      // 7. Emit real-time events
      SocketEmitter.emitToUser(clientId, 'user.debt_updated', { debt: debtAfter });
      SocketEmitter.emitToUser(clientId, 'wallet.updated', { debt: debtAfter });
      SocketEmitter.emitToUser(clientId, 'order.created', order);
      SocketEmitter.emitToUser(clientId, 'notification.created', notification);
      SocketEmitter.emitToAdmin('order.created', { order, client: { fullName: user.fullName, username: user.username } });

      return order;
    });
  }

  async clientCancelOrder(orderId: string, clientId: string) {
    return runInTransaction(async (session) => {
      const order = await this.orderRepo.findById(orderId, session);
      if (!order) {
        throw new NotFoundError('الطلب غير موجود', ErrorCode.ORDER_NOT_FOUND);
      }

      if (order.clientId._id.toString() !== clientId && order.clientId.toString() !== clientId) {
        throw new ForbiddenError('لا يمكنك إلغاء طلب لا يخصك', ErrorCode.FORBIDDEN);
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new AppError('تم إلغاء هذا الطلب مسبقاً', 400, ErrorCode.ORDER_ALREADY_CANCELLED);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new AppError('لا يمكن إلغاء الطلب بعد تأكيده أو البدء في تنفيذه', 400, ErrorCode.ORDER_CANNOT_BE_CANCELLED);
      }

      // Check double-refund protection
      const refundOpId = `REFUND_ORDER_${order._id.toString()}`;
      const existingRefund = await this.walletRepo.findByFinancialOperationId(refundOpId, session);
      if (existingRefund) {
        throw new AppError('تم استرجاع مبلغ هذا الطلب مسبقاً', 400, ErrorCode.ORDER_ALREADY_CANCELLED);
      }

      // Refund user balance atomically
      const user = await this.userRepo.findById(clientId, session);
      if (!user) {
        throw new NotFoundError('العميل غير موجود', ErrorCode.USER_NOT_FOUND);
      }

      const debtBefore = user.debt || 0;
      const updatedUser = await this.userRepo.updateDebt(clientId, -order.price, session);
      const debtAfter = updatedUser ? (updatedUser.debt || 0) : Math.max(0, Math.round((debtBefore - order.price) * 1000) / 1000);

      // Update Order Status
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.timeline.push({
        status: OrderStatus.CANCELLED,
        message: `تم إلغاء الطلب من قبل العميل وخصم ${order.price.toFixed(3)} د.ت من الدين`,
        actorType: 'CLIENT',
        actorId: clientId,
        createdAt: new Date()
      });
      await order.save({ session });

      // Create Refund Transaction
      const transactionId = `TX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      await this.walletRepo.createTransaction(
        {
          transactionId,
          financialOperationId: refundOpId,
          userId: new Types.ObjectId(clientId),
          orderId: new Types.ObjectId(order._id.toString()),
          type: WalletTransactionType.REFUND,
          amount: -order.price,
          balanceBefore: debtBefore,
          balanceAfter: debtAfter,
          description: `خصم قيمة الطلب الملغى ${order.orderNumber} من الدين`,
          reference: order.orderNumber
        },
        session
      );

      // Notification
      const notif = await this.notifRepo.create(
        {
          userId: new Types.ObjectId(clientId),
          title: 'إلغاء الطلب وتعديل الدين',
          message: `تم إلغاء طلبك ${order.orderNumber} وخصم مبلغ ${order.price.toFixed(3)} د.ت من دينك. دينك الحالي: ${debtAfter.toFixed(3)} د.ت`,
          type: NotificationType.ORDER_CANCELLED,
          metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
        },
        session
      );

      // Realtime
      SocketEmitter.emitToUser(clientId, 'user.debt_updated', { debt: debtAfter });
      SocketEmitter.emitToUser(clientId, 'wallet.updated', { debt: debtAfter });
      SocketEmitter.emitToUser(clientId, 'order.cancelled', order);
      SocketEmitter.emitToUser(clientId, 'order.updated', order);
      SocketEmitter.emitToUser(clientId, 'notification.created', notif);
      SocketEmitter.emitToAdmin('order.updated', order);

      return order;
    });
  }

  async adminConfirmOrder(orderId: string, adminId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('الطلب غير موجود', ErrorCode.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new AppError(
        `لا يمكن تأكيد الطلب من الحالة الحالية (${order.status})`,
        400,
        ErrorCode.INVALID_STATUS_TRANSITION
      );
    }

    order.status = OrderStatus.CONFIRMED;
    order.confirmedAt = new Date();
    order.timeline.push({
      status: OrderStatus.CONFIRMED,
      message: 'تمت مراجعة وتأكيد الطلب من قبل الإدارة',
      actorType: 'ADMIN',
      actorId: adminId,
      createdAt: new Date()
    });

    await order.save();

    await this.auditRepo.create({
      adminId: new Types.ObjectId(adminId),
      action: AuditAction.ORDER_CONFIRMED,
      entityType: 'Order',
      entityId: order._id.toString(),
      metadata: { orderNumber: order.orderNumber, status: order.status }
    });

    const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
    const notif = await this.notifRepo.create({
      userId: new Types.ObjectId(clientId),
      title: 'تم تأكيد طلبك',
      message: `تم تأكيد طلب الشحن ${order.orderNumber} وجاري الاستعداد للتنفيذ.`,
      type: NotificationType.ORDER_CONFIRMED,
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
    });

    SocketEmitter.emitToUser(clientId, 'order.confirmed', order);
    SocketEmitter.emitToUser(clientId, 'order.updated', order);
    SocketEmitter.emitToUser(clientId, 'notification.created', notif);
    SocketEmitter.emitToAdmin('order.updated', order);

    return order;
  }

  async adminProcessOrder(orderId: string, adminId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('الطلب غير موجود', ErrorCode.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PENDING) {
      throw new AppError(
        `لا يمكن نقل الطلب إلى قيد التنفيذ من الحالة الحالية (${order.status})`,
        400,
        ErrorCode.INVALID_STATUS_TRANSITION
      );
    }

    order.status = OrderStatus.PROCESSING;
    order.processedAt = new Date();
    order.timeline.push({
      status: OrderStatus.PROCESSING,
      message: `جاري شحن الباقة للرقم ${order.beneficiaryNumber}`,
      actorType: 'ADMIN',
      actorId: adminId,
      createdAt: new Date()
    });

    await order.save();

    await this.auditRepo.create({
      adminId: new Types.ObjectId(adminId),
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: 'Order',
      entityId: order._id.toString(),
      metadata: { orderNumber: order.orderNumber, status: order.status }
    });

    const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
    const notif = await this.notifRepo.create({
      userId: new Types.ObjectId(clientId),
      title: 'طلبك قيد الشحن',
      message: `بدأت عملية شحن الرصيد للرقم ${order.beneficiaryNumber}.`,
      type: NotificationType.ORDER_PROCESSING,
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
    });

    SocketEmitter.emitToUser(clientId, 'order.processing', order);
    SocketEmitter.emitToUser(clientId, 'order.updated', order);
    SocketEmitter.emitToUser(clientId, 'notification.created', notif);
    SocketEmitter.emitToAdmin('order.updated', order);

    return order;
  }

  async adminCompleteOrder(orderId: string, adminId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('الطلب غير موجود', ErrorCode.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.PROCESSING && order.status !== OrderStatus.CONFIRMED) {
      throw new AppError(
        `لا يمكن إكمال الطلب من الحالة الحالية (${order.status})`,
        400,
        ErrorCode.INVALID_STATUS_TRANSITION
      );
    }

    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date();
    order.timeline.push({
      status: OrderStatus.COMPLETED,
      message: `تم شحن الباقة بنجاح للرقم ${order.beneficiaryNumber}`,
      actorType: 'ADMIN',
      actorId: adminId,
      createdAt: new Date()
    });

    await order.save();

    await this.auditRepo.create({
      adminId: new Types.ObjectId(adminId),
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: 'Order',
      entityId: order._id.toString(),
      metadata: { orderNumber: order.orderNumber, status: order.status }
    });

    const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
    const notif = await this.notifRepo.create({
      userId: new Types.ObjectId(clientId),
      title: 'تم الشحن بنجاح! 🚀',
      message: `تم شحن باقة ${order.packNameSnapshot} للرقم ${order.beneficiaryNumber} بنجاح. شكراً لثقتكم بنا!`,
      type: NotificationType.ORDER_COMPLETED,
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
    });

    SocketEmitter.emitToUser(clientId, 'order.completed', order);
    SocketEmitter.emitToUser(clientId, 'order.updated', order);
    SocketEmitter.emitToUser(clientId, 'notification.created', notif);
    SocketEmitter.emitToAdmin('order.updated', order);

    return order;
  }

  async adminRejectOrder(orderId: string, adminId: string, reason?: string) {
    return runInTransaction(async (session) => {
      const order = await this.orderRepo.findById(orderId, session);
      if (!order) {
        throw new NotFoundError('الطلب غير موجود', ErrorCode.ORDER_NOT_FOUND);
      }

      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REJECTED
      ) {
        throw new AppError(
          `لا يمكن رفض الطلب وهو في الحالة (${order.status})`,
          400,
          ErrorCode.INVALID_STATUS_TRANSITION
        );
      }

      // Check double-refund protection
      const refundOpId = `REFUND_ORDER_${order._id.toString()}`;
      const existingRefund = await this.walletRepo.findByFinancialOperationId(refundOpId, session);

      const clientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
      const user = await this.userRepo.findById(clientId, session);
      if (!user) {
        throw new NotFoundError('العميل غير موجود', ErrorCode.USER_NOT_FOUND);
      }

      // If refund hasn't happened yet, perform debt refund
      let debtAfter = user.debt || 0;
      if (!existingRefund) {
        const debtBefore = user.debt || 0;
        const updatedUser = await this.userRepo.updateDebt(clientId, -order.price, session);
        debtAfter = updatedUser ? (updatedUser.debt || 0) : Math.max(0, Math.round((debtBefore - order.price) * 1000) / 1000);

        const transactionId = `TX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
        await this.walletRepo.createTransaction(
          {
            transactionId,
            financialOperationId: refundOpId,
            userId: new Types.ObjectId(clientId),
            adminId: new Types.ObjectId(adminId),
            orderId: new Types.ObjectId(order._id.toString()),
            type: WalletTransactionType.REFUND,
            amount: -order.price,
            balanceBefore: debtBefore,
            balanceAfter: debtAfter,
            description: `خصم قيمة الطلب المرفوض ${order.orderNumber} من الدين ${reason ? `(السبب: ${reason})` : ''}`,
            reference: order.orderNumber
          },
          session
        );
      }

      // Update Order Status
      order.status = OrderStatus.REJECTED;
      order.rejectedAt = new Date();
      order.timeline.push({
        status: OrderStatus.REJECTED,
        message: `تم رفض الطلب من قبل الإدارة ${reason ? `(${reason})` : ''} وخصم ${order.price.toFixed(3)} د.ت من الدين`,
        actorType: 'ADMIN',
        actorId: adminId,
        createdAt: new Date()
      });
      await order.save({ session });

      // Audit Log
      await this.auditRepo.create({
        adminId: new Types.ObjectId(adminId),
        action: AuditAction.ORDER_REJECTED,
        entityType: 'Order',
        entityId: order._id.toString(),
        metadata: { orderNumber: order.orderNumber, reason }
      });

      // Notification
      const notif = await this.notifRepo.create(
        {
          userId: new Types.ObjectId(clientId),
          title: 'تم رفض طلب الشحن وتعديل الدين',
          message: `تم رفض طلبك ${order.orderNumber}. تم خصم ${order.price.toFixed(3)} د.ت من دينك. دينك الحالي: ${debtAfter.toFixed(3)} د.ت`,
          type: NotificationType.ORDER_REJECTED,
          metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber, reason }
        },
        session
      );

      SocketEmitter.emitToUser(clientId, 'user.debt_updated', { debt: debtAfter });
      SocketEmitter.emitToUser(clientId, 'wallet.updated', { debt: debtAfter });
      SocketEmitter.emitToUser(clientId, 'order.rejected', order);
      SocketEmitter.emitToUser(clientId, 'order.updated', order);
      SocketEmitter.emitToUser(clientId, 'notification.created', notif);
      SocketEmitter.emitToAdmin('order.updated', order);

      return order;
    });
  }

  async getClientOrders(clientId: string, page = 1, limit = 20, status?: OrderStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { clientId: new Types.ObjectId(clientId) };
    if (status) {
      filter.status = status;
    }
    return this.orderRepo.findWithPagination(filter, page, limit);
  }

  async getOrderById(orderId: string, requestingUserId?: string, isAdmin = false) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('الطلب غير موجود', ErrorCode.ORDER_NOT_FOUND);
    }

    if (!isAdmin && requestingUserId) {
      const orderClientId = order.clientId._id ? order.clientId._id.toString() : order.clientId.toString();
      if (orderClientId !== requestingUserId) {
        throw new ForbiddenError('لا يمكنك عرض تفاصيل هذا الطلب', ErrorCode.FORBIDDEN);
      }
    }

    return order;
  }

  async getAdminOrders(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    networkId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (params.status) {
      filter.status = params.status;
    }
    if (params.networkId) {
      filter.networkId = new Types.ObjectId(params.networkId);
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
