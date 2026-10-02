"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
const response_1 = require("../utils/response");
class NotificationController {
    notifService;
    constructor() {
        this.notifService = new notification_service_1.NotificationService();
    }
    getNotifications = async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const { notifications, total, unreadCount } = await this.notifService.getUserNotifications(userId, page, limit);
            return res.status(200).json({
                success: true,
                message: 'تم جلب الإشعارات بنجاح',
                data: {
                    items: notifications,
                    unreadCount,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit) || 1
                    }
                }
            });
        }
        catch (error) {
            next(error);
        }
    };
    markAsRead = async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const id = req.params.id;
            const updated = await this.notifService.markAsRead(id, userId);
            return response_1.ApiResponse.success(res, updated, 'تم تحديد الإشعار كمقروء');
        }
        catch (error) {
            next(error);
        }
    };
    markAllAsRead = async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const result = await this.notifService.markAllAsRead(userId);
            return response_1.ApiResponse.success(res, result, 'تم تحديد جميع الإشعارات كمقروءة');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.NotificationController = NotificationController;
