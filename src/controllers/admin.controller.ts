import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { WalletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest, UserStatus, UserRole } from '../types';

export class AdminController {
  private userService: UserService;
  private walletService: WalletService;

  constructor() {
    this.userService = new UserService();
    this.walletService = new WalletService();
  }

  getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await this.userService.getAdminDashboard();
      return ApiResponse.success(res, stats, 'تم جلب إحصائيات لوحة الإدارة');
    } catch (error) {
      next(error);
    }
  };

  getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const status = req.query.status as UserStatus | undefined;
      const role = req.query.role as UserRole | undefined;
      const search = req.query.search as string | undefined;

      const { users, total } = await this.userService.listUsers({
        page,
        limit,
        status,
        role,
        search
      });

      return ApiResponse.paginated(res, users, page, limit, total, 'تم جلب قائمة العملاء');
    } catch (error) {
      next(error);
    }
  };

  getUserDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.id;
      const details = await this.userService.getAdminUserDetails(targetUserId);
      return ApiResponse.success(res, details, 'تم جلب تفاصيل العميل');
    } catch (error) {
      next(error);
    }
  };

  approveUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;

      const user = await this.userService.updateUserStatus({
        targetUserId,
        adminId,
        newStatus: UserStatus.ACTIVE,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return ApiResponse.success(res, user, 'تم تفعيل وقبول حساب العميل بنجاح');
    } catch (error) {
      next(error);
    }
  };

  rejectUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;

      const user = await this.userService.updateUserStatus({
        targetUserId,
        adminId,
        newStatus: UserStatus.REJECTED,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return ApiResponse.success(res, user, 'تم رفض حساب العميل');
    } catch (error) {
      next(error);
    }
  };

  blockUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;

      const user = await this.userService.updateUserStatus({
        targetUserId,
        adminId,
        newStatus: UserStatus.BLOCKED,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return ApiResponse.success(res, user, 'تم حظر حساب العميل');
    } catch (error) {
      next(error);
    }
  };

  unblockUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;

      const user = await this.userService.updateUserStatus({
        targetUserId,
        adminId,
        newStatus: UserStatus.ACTIVE,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return ApiResponse.success(res, user, 'تم إلغاء حظر العميل وتفعيل الحساب');
    } catch (error) {
      next(error);
    }
  };

  addBalance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;
      const { amount, description } = req.body;

      const result = await this.walletService.adminAddBalance({
        userId: targetUserId,
        adminId,
        amount,
        description,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return ApiResponse.success(res, result, 'تم شحن رصيد العميل بنجاح');
    } catch (error) {
      next(error);
    }
  };

  settleDebt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;
      const { amount, description } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'يرجى إدخال مبلغ صحيح أكبر من الصفر',
          code: 'VALIDATION_ERROR'
        });
      }

      const result = await this.walletService.adminSettleDebt({
        userId: targetUserId,
        adminId,
        amount: numAmount,
        description,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return ApiResponse.success(res, result, 'تم تسجيل تسديد دفعة من الدين بنجاح');
    } catch (error) {
      next(error);
    }
  };

  resetDebt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;
      const { description } = req.body || {};

      const result = await this.walletService.adminResetDebt({
        userId: targetUserId,
        adminId,
        description,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return ApiResponse.success(res, result, 'تم تصفير دين الحساب بالكامل بنجاح');
    } catch (error) {
      next(error);
    }
  };
}
