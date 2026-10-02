"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const user_service_1 = require("../services/user.service");
const wallet_service_1 = require("../services/wallet.service");
const response_1 = require("../utils/response");
const types_1 = require("../types");
class AdminController {
    userService;
    walletService;
    constructor() {
        this.userService = new user_service_1.UserService();
        this.walletService = new wallet_service_1.WalletService();
    }
    getDashboard = async (req, res, next) => {
        try {
            const stats = await this.userService.getAdminDashboard();
            return response_1.ApiResponse.success(res, stats, 'تم جلب إحصائيات لوحة الإدارة');
        }
        catch (error) {
            next(error);
        }
    };
    getUsers = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const status = req.query.status;
            const role = req.query.role;
            const search = req.query.search;
            const { users, total } = await this.userService.listUsers({
                page,
                limit,
                status,
                role,
                search
            });
            return response_1.ApiResponse.paginated(res, users, page, limit, total, 'تم جلب قائمة العملاء');
        }
        catch (error) {
            next(error);
        }
    };
    getUserDetails = async (req, res, next) => {
        try {
            const targetUserId = req.params.id;
            const details = await this.userService.getAdminUserDetails(targetUserId);
            return response_1.ApiResponse.success(res, details, 'تم جلب تفاصيل العميل');
        }
        catch (error) {
            next(error);
        }
    };
    approveUser = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const targetUserId = req.params.id;
            const user = await this.userService.updateUserStatus({
                targetUserId,
                adminId,
                newStatus: types_1.UserStatus.ACTIVE,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
            return response_1.ApiResponse.success(res, user, 'تم تفعيل وقبول حساب العميل بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    rejectUser = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const targetUserId = req.params.id;
            const user = await this.userService.updateUserStatus({
                targetUserId,
                adminId,
                newStatus: types_1.UserStatus.REJECTED,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
            return response_1.ApiResponse.success(res, user, 'تم رفض حساب العميل');
        }
        catch (error) {
            next(error);
        }
    };
    blockUser = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const targetUserId = req.params.id;
            const user = await this.userService.updateUserStatus({
                targetUserId,
                adminId,
                newStatus: types_1.UserStatus.BLOCKED,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
            return response_1.ApiResponse.success(res, user, 'تم حظر حساب العميل');
        }
        catch (error) {
            next(error);
        }
    };
    unblockUser = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const targetUserId = req.params.id;
            const user = await this.userService.updateUserStatus({
                targetUserId,
                adminId,
                newStatus: types_1.UserStatus.ACTIVE,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
            return response_1.ApiResponse.success(res, user, 'تم إلغاء حظر العميل وتفعيل الحساب');
        }
        catch (error) {
            next(error);
        }
    };
    addBalance = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
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
            return response_1.ApiResponse.success(res, result, 'تم شحن رصيد العميل بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    settleDebt = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
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
            return response_1.ApiResponse.success(res, result, 'تم تسجيل تسديد دفعة من الدين بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    resetDebt = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const targetUserId = req.params.id;
            const { description } = req.body || {};
            const result = await this.walletService.adminResetDebt({
                userId: targetUserId,
                adminId,
                description,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
            return response_1.ApiResponse.success(res, result, 'تم تصفير دين الحساب بالكامل بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AdminController = AdminController;
