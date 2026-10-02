"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const user_service_1 = require("../services/user.service");
const response_1 = require("../utils/response");
class AuthController {
    authService;
    userService;
    constructor() {
        this.authService = new auth_service_1.AuthService();
        this.userService = new user_service_1.UserService();
    }
    register = async (req, res, next) => {
        try {
            const { username, fullName, password } = req.body;
            const result = await this.authService.register(username, fullName, password);
            return response_1.ApiResponse.success(res, result.user, result.message, 201);
        }
        catch (error) {
            next(error);
        }
    };
    login = async (req, res, next) => {
        try {
            const { username, password } = req.body;
            const result = await this.authService.login(username, password);
            return response_1.ApiResponse.success(res, result, 'تم تسجيل الدخول بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    refresh = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refreshToken(refreshToken);
            return response_1.ApiResponse.success(res, result, 'تم تجديد الجلسة بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    logout = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            await this.authService.logout(refreshToken);
            return response_1.ApiResponse.success(res, null, 'تم تسجيل الخروج بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    me = async (req, res, next) => {
        try {
            const user = await this.userService.getProfile(req.user.userId);
            return response_1.ApiResponse.success(res, user, 'تم جلب بيانات الحساب');
        }
        catch (error) {
            next(error);
        }
    };
    changePassword = async (req, res, next) => {
        try {
            const { oldPassword, newPassword } = req.body;
            await this.authService.changePassword(req.user.userId, oldPassword, newPassword);
            return response_1.ApiResponse.success(res, null, 'تم تغيير كلمة المرور بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AuthController = AuthController;
