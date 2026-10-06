import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  private authService: AuthService;
  private userService: UserService;
  private userRepo: UserRepository;

  constructor() {
    this.authService = new AuthService();
    this.userService = new UserService();
    this.userRepo = new UserRepository();
  }

  register = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { username, fullName, password } = req.body;
      const result = await this.authService.register(username, fullName, password);
      return ApiResponse.success(res, result.user, result.message, 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const result = await this.authService.login(username, password);
      return ApiResponse.success(res, result, 'تم تسجيل الدخول بنجاح');
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      return ApiResponse.success(res, result, 'تم تجديد الجلسة بنجاح');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      await this.authService.logout(refreshToken);
      return ApiResponse.success(res, null, 'تم تسجيل الخروج بنجاح');
    } catch (error) {
      next(error);
    }
  };

  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getProfile(req.user!.userId);
      return ApiResponse.success(res, user, 'تم جلب بيانات الحساب');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body;
      await this.authService.changePassword(req.user!.userId, oldPassword, newPassword);
      return ApiResponse.success(res, null, 'تم تغيير كلمة المرور بنجاح');
    } catch (error) {
      next(error);
    }
  };

  saveFcmToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return ApiResponse.success(res, null, 'token مطلوب');
      }
      await this.userRepo.saveFcmToken(req.user!.userId, token);
      return ApiResponse.success(res, null, 'تم حفظ رمز الإشعارات');
    } catch (error) {
      next(error);
    }
  };
}
