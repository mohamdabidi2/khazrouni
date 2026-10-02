import { Response, NextFunction } from 'express';
import { AnnouncementService } from '../services/announcement.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class AnnouncementController {
  private announcementService: AnnouncementService;

  constructor() {
    this.announcementService = new AnnouncementService();
  }

  getActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const announcements = await this.announcementService.getActive();
      return ApiResponse.success(res, announcements, 'تم جلب الإعلانات النشطة');
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const announcements = await this.announcementService.getAll();
      return ApiResponse.success(res, announcements, 'تم جلب جميع الإعلانات');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const announcement = await this.announcementService.create(req.body);
      return ApiResponse.success(res, announcement, 'تم إنشاء الإعلان بنجاح', 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const announcement = await this.announcementService.update(req.params.id, req.body);
      return ApiResponse.success(res, announcement, 'تم تعديل الإعلان بنجاح');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.announcementService.delete(req.params.id);
      return ApiResponse.success(res, null, 'تم حذف الإعلان بنجاح');
    } catch (error) {
      next(error);
    }
  };
}
