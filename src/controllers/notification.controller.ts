import { Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class NotificationController {
  private notifService: NotificationService;

  constructor() {
    this.notifService = new NotificationService();
  }

  getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const { notifications, total, unreadCount } = await this.notifService.getUserNotifications(
        userId,
        page,
        limit
      );

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
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      const updated = await this.notifService.markAsRead(id, userId);
      return ApiResponse.success(res, updated, 'تم تحديد الإشعار كمقروء');
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.notifService.markAllAsRead(userId);
      return ApiResponse.success(res, result, 'تم تحديد جميع الإشعارات كمقروءة');
    } catch (error) {
      next(error);
    }
  };
}
