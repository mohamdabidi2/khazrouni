import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { WalletRepository } from '../repositories/wallet.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { WalletTransactionType, NotificationType, AuditAction, ErrorCode } from '../types';
import { AppError, NotFoundError } from '../utils/errors';
import { runInTransaction } from '../utils/transaction.util';
import { SocketEmitter } from '../sockets/socket.service';
import { FcmEmitter } from './fcm.service';


export class WalletService {
  private walletRepo: WalletRepository;
  private userRepo: UserRepository;
  private auditRepo: AuditLogRepository;
  private notificationRepo: NotificationRepository;

  constructor() {
    this.walletRepo = new WalletRepository();
    this.userRepo = new UserRepository();
    this.auditRepo = new AuditLogRepository();
    this.notificationRepo = new NotificationRepository();
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود', ErrorCode.USER_NOT_FOUND);
    }
    return user.balance;
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    return this.walletRepo.findByUserId(userId, page, limit);
  }

  async getTransactionsByOrderId(orderId: string) {
    return this.walletRepo.findByOrderId(orderId);
  }

  async adminAddBalance(params: {
    userId: string;
    adminId: string;
    amount: number;
    description: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { userId, adminId, amount, description, ip, userAgent } = params;

    if (amount <= 0) {
      throw new AppError('يجب أن يكون المبلغ المضاف أكبر من الصفر', 400, ErrorCode.VALIDATION_ERROR);
    }

    return runInTransaction(async (session) => {
      const user = await this.userRepo.findById(userId, session);
      if (!user) {
        throw new NotFoundError('العميل غير موجود', ErrorCode.USER_NOT_FOUND);
      }

      const balanceBefore = user.balance;
      const balanceAfter = Math.round((balanceBefore + amount) * 1000) / 1000;

      const updatedUser = await this.userRepo.updateBalance(userId, amount, session);
      if (!updatedUser) {
        throw new AppError('فشل في تحديث الرصيد', 500, ErrorCode.INTERNAL_ERROR);
      }

      const transactionId = `TX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      const financialOpId = `ADMIN_DEPOSIT_${Date.now()}_${uuidv4().substring(0, 6)}`;

      const transaction = await this.walletRepo.createTransaction(
        {
          transactionId,
          financialOperationId: financialOpId,
          userId: new Types.ObjectId(userId),
          adminId: new Types.ObjectId(adminId),
          type: WalletTransactionType.DEPOSIT,
          amount,
          balanceBefore,
          balanceAfter,
          description: description || 'إيداع رصيد من قبل الإدارة',
          reference: `ADMIN-${adminId}`
        },
        session
      );

      // Create Audit Log
      await this.auditRepo.create({
        adminId: new Types.ObjectId(adminId),
        action: AuditAction.BALANCE_ADDED,
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
      const notif = await this.notificationRepo.create(
        {
          userId: new Types.ObjectId(userId),
          title: 'إيداع رصيد',
          message: `تمت إضافة رصيد بقيمة ${amount.toFixed(3)} د.ت إلى محفظتك. رصيدك الحالي: ${balanceAfter.toFixed(3)} د.ت`,
          type: NotificationType.SYSTEM,
          metadata: { transactionId, amount, balanceAfter }
        },
        session
      );

      // Emit real-time socket events
      SocketEmitter.emitToUser(userId, 'wallet.updated', { balance: balanceAfter, transaction });
      SocketEmitter.emitToUser(userId, 'notification.created', notif);
      // FCM
      FcmEmitter.emitToUser(userId, notif.title, notif.message).catch(() => {});


      return {
        balance: balanceAfter,
        transaction
      };
    });
  }

  async getDebt(userId: string): Promise<number> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود', ErrorCode.USER_NOT_FOUND);
    }
    return user.debt || 0;
  }

  async adminSettleDebt(params: {
    userId: string;
    adminId: string;
    amount: number;
    description?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { userId, adminId, amount, description, ip, userAgent } = params;

    if (amount <= 0) {
      throw new AppError('يجب أن يكون المبلغ المسدد أكبر من الصفر', 400, ErrorCode.VALIDATION_ERROR);
    }

    return runInTransaction(async (session) => {
      const user = await this.userRepo.findById(userId, session);
      if (!user) {
        throw new NotFoundError('العميل غير موجود', ErrorCode.USER_NOT_FOUND);
      }

      const debtBefore = user.debt || 0;
      if (debtBefore <= 0) {
        throw new AppError('لا توجد ديون مستحقة على هذا الحساب', 400, ErrorCode.VALIDATION_ERROR);
      }

      const settledResult = await this.userRepo.settleDebt(userId, amount, session);
      if (!settledResult) {
        throw new AppError('فشل في تسجيل تسديد الدين', 500, ErrorCode.INTERNAL_ERROR);
      }

      const { user: updatedUser, settledAmount } = settledResult;
      const debtAfter = updatedUser.debt || 0;

      const transactionId = `TX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      const financialOpId = `DEBT_PAYMENT_${Date.now()}_${uuidv4().substring(0, 6)}`;

      const transaction = await this.walletRepo.createTransaction(
        {
          transactionId,
          financialOperationId: financialOpId,
          userId: new Types.ObjectId(userId),
          adminId: new Types.ObjectId(adminId),
          type: WalletTransactionType.DEBT_PAYMENT,
          amount: -settledAmount,
          balanceBefore: debtBefore,
          balanceAfter: debtAfter,
          description: description || `تسديد دفعة من الدين بقيمة ${settledAmount.toFixed(3)} د.ت`,
          reference: `ADMIN-${adminId}`
        },
        session
      );

      // Audit Log
      await this.auditRepo.create({
        adminId: new Types.ObjectId(adminId),
        action: AuditAction.DEBT_SETTLED,
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
      const notif = await this.notificationRepo.create(
        {
          userId: new Types.ObjectId(userId),
          title: 'تسديد دفعة من الدين',
          message: `تم تسجيل خلاص مبلغ ${settledAmount.toFixed(3)} د.ت من دينك بنجاح. الدين المتبقي: ${debtAfter.toFixed(3)} د.ت`,
          type: NotificationType.DEBT_SETTLED,
          metadata: { transactionId, settledAmount, debtAfter }
        },
        session
      );

      // Sockets
      SocketEmitter.emitToUser(userId, 'user.debt_updated', { debt: debtAfter });
      SocketEmitter.emitToUser(userId, 'wallet.updated', { debt: debtAfter, transaction });
      SocketEmitter.emitToUser(userId, 'notification.created', notif);
      // FCM
      FcmEmitter.emitToUser(userId, notif.title, notif.message).catch(() => {});


      return {
        settledAmount,
        debtBefore,
        debtAfter,
        user: updatedUser,
        transaction
      };
    });
  }

  async adminResetDebt(params: {
    userId: string;
    adminId: string;
    description?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { userId, adminId, description, ip, userAgent } = params;

    return runInTransaction(async (session) => {
      const user = await this.userRepo.findById(userId, session);
      if (!user) {
        throw new NotFoundError('العميل غير موجود', ErrorCode.USER_NOT_FOUND);
      }

      const debtBefore = user.debt || 0;
      const resetResult = await this.userRepo.resetDebt(userId, session);
      if (!resetResult) {
        throw new AppError('فشل في تصفير الدين', 500, ErrorCode.INTERNAL_ERROR);
      }

      const { user: updatedUser, clearedAmount } = resetResult;
      const debtAfter = 0;

      const transactionId = `TX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      const financialOpId = `DEBT_RESET_${Date.now()}_${uuidv4().substring(0, 6)}`;

      const transaction = await this.walletRepo.createTransaction(
        {
          transactionId,
          financialOperationId: financialOpId,
          userId: new Types.ObjectId(userId),
          adminId: new Types.ObjectId(adminId),
          type: WalletTransactionType.DEBT_RESET,
          amount: -clearedAmount,
          balanceBefore: debtBefore,
          balanceAfter: 0,
          description: description || `تصفير كامل الدين (خلاص كامل الحساب: ${clearedAmount.toFixed(3)} د.ت)`,
          reference: `ADMIN-${adminId}`
        },
        session
      );

      // Audit Log
      await this.auditRepo.create({
        adminId: new Types.ObjectId(adminId),
        action: AuditAction.DEBT_RESET,
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
      const notif = await this.notificationRepo.create(
        {
          userId: new Types.ObjectId(userId),
          title: 'خلاص كامل الدين',
          message: `تم تصفير دين حسابك بالكامل بنجاح (${clearedAmount.toFixed(3)} د.ت). ليس عليك أي ديون حالياً.`,
          type: NotificationType.DEBT_SETTLED,
          metadata: { transactionId, clearedAmount, debtAfter: 0 }
        },
        session
      );

      // Sockets
      SocketEmitter.emitToUser(userId, 'user.debt_updated', { debt: 0 });
      SocketEmitter.emitToUser(userId, 'wallet.updated', { debt: 0, transaction });
      SocketEmitter.emitToUser(userId, 'notification.created', notif);
      // FCM
      FcmEmitter.emitToUser(userId, notif.title, notif.message).catch(() => {});


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
