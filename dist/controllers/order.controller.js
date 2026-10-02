"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("../services/order.service");
const response_1 = require("../utils/response");
class OrderController {
    orderService;
    constructor() {
        this.orderService = new order_service_1.OrderService();
    }
    createOrder = async (req, res, next) => {
        try {
            const clientId = req.user.userId;
            const { packId, beneficiaryNumber } = req.body;
            const order = await this.orderService.createOrder(clientId, packId, beneficiaryNumber);
            return response_1.ApiResponse.success(res, order, 'تم إرسال طلبك بنجاح', 201);
        }
        catch (error) {
            next(error);
        }
    };
    getMyOrders = async (req, res, next) => {
        try {
            const clientId = req.user.userId;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const status = req.query.status;
            const { orders, total } = await this.orderService.getClientOrders(clientId, page, limit, status);
            return response_1.ApiResponse.paginated(res, orders, page, limit, total, 'تم جلب طلباتك بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    getOrderById = async (req, res, next) => {
        try {
            const orderId = req.params.id;
            const userId = req.user?.userId;
            const isAdmin = req.user?.role === 'ADMIN';
            const order = await this.orderService.getOrderById(orderId, userId, isAdmin);
            return response_1.ApiResponse.success(res, order, 'تم جلب تفاصيل الطلب');
        }
        catch (error) {
            next(error);
        }
    };
    cancelOrder = async (req, res, next) => {
        try {
            const clientId = req.user.userId;
            const orderId = req.params.id;
            const order = await this.orderService.clientCancelOrder(orderId, clientId);
            return response_1.ApiResponse.success(res, order, 'تم إلغاء الطلب واسترجاع المبلغ إلى رصيدك بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    confirmOrder = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const orderId = req.params.id;
            const order = await this.orderService.adminConfirmOrder(orderId, adminId);
            return response_1.ApiResponse.success(res, order, 'تم تأكيد الطلب بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    processOrder = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const orderId = req.params.id;
            const order = await this.orderService.adminProcessOrder(orderId, adminId);
            return response_1.ApiResponse.success(res, order, 'تم نقل الطلب إلى قيد التنفيذ');
        }
        catch (error) {
            next(error);
        }
    };
    completeOrder = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const orderId = req.params.id;
            const order = await this.orderService.adminCompleteOrder(orderId, adminId);
            return response_1.ApiResponse.success(res, order, 'تم إكمال شحن الطلب بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    rejectOrder = async (req, res, next) => {
        try {
            const adminId = req.user.userId;
            const orderId = req.params.id;
            const { reason } = req.body;
            const order = await this.orderService.adminRejectOrder(orderId, adminId, reason);
            return response_1.ApiResponse.success(res, order, 'تم رفض الطلب واسترجاع الرصيد للعميل');
        }
        catch (error) {
            next(error);
        }
    };
    getAdminOrders = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const status = req.query.status;
            const networkId = req.query.networkId;
            const search = req.query.search;
            const dateFrom = req.query.dateFrom;
            const dateTo = req.query.dateTo;
            const { orders, total } = await this.orderService.getAdminOrders({
                page,
                limit,
                status,
                networkId,
                search,
                dateFrom,
                dateTo
            });
            return response_1.ApiResponse.paginated(res, orders, page, limit, total, 'تم جلب الطلبات بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.OrderController = OrderController;
