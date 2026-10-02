import { Response, NextFunction } from 'express';
import { WalletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  getBalance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const balance = await this.walletService.getBalance(userId);
      return ApiResponse.success(res, { balance }, 'تم جلب الرصيد بنجاح');
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const { transactions, total } = await this.walletService.getTransactions(userId, page, limit);
      return ApiResponse.paginated(res, transactions, page, limit, total, 'تم جلب حركات المحفظة');
    } catch (error) {
      next(error);
    }
  };

  getUserWalletByAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const [balance, { transactions, total }] = await Promise.all([
        this.walletService.getBalance(targetUserId),
        this.walletService.getTransactions(targetUserId, page, limit)
      ]);

      return ApiResponse.success(
        res,
        {
          balance,
          transactions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          }
        },
        'تم جلب محفظة العميل'
      );
    } catch (error) {
      next(error);
    }
  };
}
