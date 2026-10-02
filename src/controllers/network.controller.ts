import { Response, NextFunction } from 'express';
import { NetworkService } from '../services/network.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class NetworkController {
  private networkService: NetworkService;

  constructor() {
    this.networkService = new NetworkService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const networks = await this.networkService.getAll(activeOnly);
      return ApiResponse.success(res, networks, 'تم جلب الشبكات بنجاح');
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const network = await this.networkService.getById(req.params.id);
      return ApiResponse.success(res, network);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const network = await this.networkService.create(req.body);
      return ApiResponse.success(res, network, 'تمت إضافة الشبكة بنجاح', 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const network = await this.networkService.update(req.params.id, req.body);
      return ApiResponse.success(res, network, 'تم تعديل الشبكة بنجاح');
    } catch (error) {
      next(error);
    }
  };

  toggleStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { isActive } = req.body;
      const network = await this.networkService.toggleStatus(req.params.id, Boolean(isActive));
      return ApiResponse.success(res, network, 'تم تحديث حالة الشبكة');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.networkService.delete(req.params.id);
      return ApiResponse.success(res, null, 'تم حذف الشبكة بنجاح');
    } catch (error) {
      next(error);
    }
  };
}
