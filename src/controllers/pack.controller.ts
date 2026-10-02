import { Response, NextFunction } from 'express';
import { PackService } from '../services/pack.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class PackController {
  private packService: PackService;

  constructor() {
    this.packService = new PackService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const networkId = req.query.networkId as string | undefined;
      const activeOnly = req.query.activeOnly !== 'false';

      let packs;
      if (networkId) {
        packs = await this.packService.getByNetwork(networkId, activeOnly);
      } else {
        packs = await this.packService.getAll(activeOnly);
      }

      return ApiResponse.success(res, packs, 'تم جلب الباقات بنجاح');
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pack = await this.packService.getById(req.params.id);
      return ApiResponse.success(res, pack);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pack = await this.packService.create(req.body);
      return ApiResponse.success(res, pack, 'تمت إضافة الباقة بنجاح', 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pack = await this.packService.update(req.params.id, req.body);
      return ApiResponse.success(res, pack, 'تم تعديل الباقة بنجاح');
    } catch (error) {
      next(error);
    }
  };

  toggleStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { isActive } = req.body;
      const pack = await this.packService.toggleStatus(req.params.id, Boolean(isActive));
      return ApiResponse.success(res, pack, 'تم تحديث حالة الباقة');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.packService.delete(req.params.id);
      return ApiResponse.success(res, null, 'تم حذف الباقة بنجاح');
    } catch (error) {
      next(error);
    }
  };
}
