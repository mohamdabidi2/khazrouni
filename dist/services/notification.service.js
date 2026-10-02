"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const notification_repository_1 = require("../repositories/notification.repository");
const errors_1 = require("../utils/errors");
class NotificationService {
    notifRepo;
    constructor() {
        this.notifRepo = new notification_repository_1.NotificationRepository();
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        return this.notifRepo.findByUserId(userId, page, limit);
    }
    async markAsRead(id, userId) {
        const updated = await this.notifRepo.markAsRead(id, userId);
        if (!updated) {
            throw new errors_1.NotFoundError('الإشعار غير موجود');
        }
        return updated;
    }
    async markAllAsRead(userId) {
        return this.notifRepo.markAllAsRead(userId);
    }
}
exports.NotificationService = NotificationService;
