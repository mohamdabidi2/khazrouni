import { NotificationRepository } from '../repositories/notification.repository';
import { NotFoundError } from '../utils/errors';

export class NotificationService {
  private notifRepo: NotificationRepository;

  constructor() {
    this.notifRepo = new NotificationRepository();
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    return this.notifRepo.findByUserId(userId, page, limit);
  }

  async markAsRead(id: string, userId: string) {
    const updated = await this.notifRepo.markAsRead(id, userId);
    if (!updated) {
      throw new NotFoundError('الإشعار غير موجود');
    }
    return updated;
  }

  async markAllAsRead(userId: string) {
    return this.notifRepo.markAllAsRead(userId);
  }
}
