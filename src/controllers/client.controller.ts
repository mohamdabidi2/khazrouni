import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class ClientController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.user!.userId;
      const data = await this.userService.getClientDashboard(clientId);
      return ApiResponse.success(res, data, 'تم جلب بيانات لوحة التحكم');
    } catch (error) {
      next(error);
    }
  };
}
