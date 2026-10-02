"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const notification_model_1 = require("../models/notification.model");
class NotificationRepository {
    async create(data, session) {
        const notification = new notification_model_1.NotificationModel(data);
        return notification.save({ session });
    }
    async findByUserId(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const filter = { userId };
        const [notifications, total, unreadCount] = await Promise.all([
            notification_model_1.NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            notification_model_1.NotificationModel.countDocuments(filter),
            notification_model_1.NotificationModel.countDocuments({ userId, isRead: false })
        ]);
        return {
            notifications: notifications,
            total,
            unreadCount
        };
    }
    async markAsRead(id, userId) {
        return notification_model_1.NotificationModel.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
    }
    async markAllAsRead(userId) {
        const result = await notification_model_1.NotificationModel.updateMany({ userId, isRead: false }, { isRead: true });
        return { modifiedCount: result.modifiedCount };
    }
    async getUnreadCount(userId) {
        return notification_model_1.NotificationModel.countDocuments({ userId, isRead: false });
    }
}
exports.NotificationRepository = NotificationRepository;
