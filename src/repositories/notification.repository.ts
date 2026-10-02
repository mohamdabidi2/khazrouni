import { ClientSession, FilterQuery } from 'mongoose';
import { INotification, NotificationModel } from '../models/notification.model';

export class NotificationRepository {
  async create(data: Partial<INotification>, session?: ClientSession): Promise<INotification> {
    const notification = new NotificationModel(data);
    return notification.save({ session });
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<INotification> = { userId };

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments({ userId, isRead: false })
    ]);

    return {
      notifications: notifications as unknown as INotification[],
      total,
      unreadCount
    };
  }

  async markAsRead(id: string, userId: string): Promise<INotification | null> {
    return NotificationModel.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await NotificationModel.updateMany({ userId, isRead: false }, { isRead: true });
    return { modifiedCount: result.modifiedCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, isRead: false });
  }
}
