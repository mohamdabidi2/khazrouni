"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const wallet_service_1 = require("../services/wallet.service");
const response_1 = require("../utils/response");
class WalletController {
    walletService;
    constructor() {
        this.walletService = new wallet_service_1.WalletService();
    }
    getBalance = async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const balance = await this.walletService.getBalance(userId);
            return response_1.ApiResponse.success(res, { balance }, 'تم جلب الرصيد بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    getTransactions = async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const { transactions, total } = await this.walletService.getTransactions(userId, page, limit);
            return response_1.ApiResponse.paginated(res, transactions, page, limit, total, 'تم جلب حركات المحفظة');
        }
        catch (error) {
            next(error);
        }
    };
    getUserWalletByAdmin = async (req, res, next) => {
        try {
            const targetUserId = req.params.id;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const [balance, { transactions, total }] = await Promise.all([
                this.walletService.getBalance(targetUserId),
                this.walletService.getTransactions(targetUserId, page, limit)
            ]);
            return response_1.ApiResponse.success(res, {
                balance,
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1
                }
            }, 'تم جلب محفظة العميل');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.WalletController = WalletController;
