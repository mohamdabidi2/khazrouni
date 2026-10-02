import { Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest, OrderStatus } from '../types';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  createOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.user!.userId;
      const { packId, beneficiaryNumber } = req.body;
      const order = await this.orderService.createOrder(clientId, packId, beneficiaryNumber);
      return ApiResponse.success(res, order, 'تم إرسال طلبك بنجاح', 201);
    } catch (error) {
      next(error);
    }
  };

  getMyOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.user!.userId;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const status = req.query.status as OrderStatus | undefined;

      const { orders, total } = await this.orderService.getClientOrders(clientId, page, limit, status);
      return ApiResponse.paginated(res, orders, page, limit, total, 'تم جلب طلباتك بنجاح');
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'ADMIN';

      const order = await this.orderService.getOrderById(orderId, userId, isAdmin);
      return ApiResponse.success(res, order, 'تم جلب تفاصيل الطلب');
    } catch (error) {
      next(error);
    }
  };

  cancelOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.user!.userId;
      const orderId = req.params.id;

      const order = await this.orderService.clientCancelOrder(orderId, clientId);
      return ApiResponse.success(res, order, 'تم إلغاء الطلب واسترجاع المبلغ إلى رصيدك بنجاح');
    } catch (error) {
      next(error);
    }
  };

  confirmOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const orderId = req.params.id;

      const order = await this.orderService.adminConfirmOrder(orderId, adminId);
      return ApiResponse.success(res, order, 'تم تأكيد الطلب بنجاح');
    } catch (error) {
      next(error);
    }
  };

  processOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const orderId = req.params.id;

      const order = await this.orderService.adminProcessOrder(orderId, adminId);
      return ApiResponse.success(res, order, 'تم نقل الطلب إلى قيد التنفيذ');
    } catch (error) {
      next(error);
    }
  };

  completeOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const orderId = req.params.id;

      const order = await this.orderService.adminCompleteOrder(orderId, adminId);
      return ApiResponse.success(res, order, 'تم إكمال شحن الطلب بنجاح');
    } catch (error) {
      next(error);
    }
  };

  rejectOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const orderId = req.params.id;
      const { reason } = req.body;

      const order = await this.orderService.adminRejectOrder(orderId, adminId, reason);
      return ApiResponse.success(res, order, 'تم رفض الطلب واسترجاع الرصيد للعميل');
    } catch (error) {
      next(error);
    }
  };

  getAdminOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const status = req.query.status as OrderStatus | undefined;
      const networkId = req.query.networkId as string | undefined;
      const search = req.query.search as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      const { orders, total } = await this.orderService.getAdminOrders({
        page,
        limit,
        status,
        networkId,
        search,
        dateFrom,
        dateTo
      });

      return ApiResponse.paginated(res, orders, page, limit, total, 'تم جلب الطلبات بنجاح');
    } catch (error) {
      next(error);
    }
  };
}
