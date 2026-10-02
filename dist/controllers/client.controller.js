"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientController = void 0;
const user_service_1 = require("../services/user.service");
const response_1 = require("../utils/response");
class ClientController {
    userService;
    constructor() {
        this.userService = new user_service_1.UserService();
    }
    getDashboard = async (req, res, next) => {
        try {
            const clientId = req.user.userId;
            const data = await this.userService.getClientDashboard(clientId);
            return response_1.ApiResponse.success(res, data, 'تم جلب بيانات لوحة التحكم');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ClientController = ClientController;
