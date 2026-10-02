"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRepository = void 0;
const order_model_1 = require("../models/order.model");
const types_1 = require("../types");
class OrderRepository {
    async findById(id, session) {
        return order_model_1.OrderModel.findById(id)
            .populate('clientId', 'fullName username balance status')
            .populate('networkId', 'name code logo brandColor')
            .populate('packId', 'name dataAmount price')
            .session(session || null);
    }
    async findByOrderNumber(orderNumber) {
        return order_model_1.OrderModel.findOne({ orderNumber })
            .populate('clientId', 'fullName username balance')
            .populate('networkId', 'name code logo brandColor')
            .populate('packId', 'name dataAmount price');
    }
    async create(orderData, session) {
        const order = new order_model_1.OrderModel(orderData);
        return order.save({ session });
    }
    async updateById(id, update, session) {
        return order_model_1.OrderModel.findByIdAndUpdate(id, update, { new: true, session });
    }
    async findWithPagination(filter, page, limit) {
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            order_model_1.OrderModel.find(filter)
                .populate('clientId', 'fullName username balance')
                .populate('networkId', 'name code logo brandColor')
                .populate('packId', 'name dataAmount price')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            order_model_1.OrderModel.countDocuments(filter)
        ]);
        return { orders: orders, total };
    }
    async count(filter = {}) {
        return order_model_1.OrderModel.countDocuments(filter);
    }
    async getRecentOrders(clientId, limit = 5) {
        const filter = clientId ? { clientId } : {};
        return order_model_1.OrderModel.find(filter)
            .populate('clientId', 'fullName username')
            .populate('networkId', 'name code logo brandColor')
            .sort({ createdAt: -1 })
            .limit(limit);
    }
    async getTodayRevenue() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const result = await order_model_1.OrderModel.aggregate([
            {
                $match: {
                    status: { $in: [types_1.OrderStatus.COMPLETED, types_1.OrderStatus.PROCESSING, types_1.OrderStatus.CONFIRMED] },
                    createdAt: { $gte: startOfDay }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$price' }
                }
            }
        ]);
        return result[0]?.total || 0;
    }
    async getTotalRevenue() {
        const result = await order_model_1.OrderModel.aggregate([
            {
                $match: {
                    status: { $in: [types_1.OrderStatus.COMPLETED, types_1.OrderStatus.PROCESSING, types_1.OrderStatus.CONFIRMED] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$price' }
                }
            }
        ]);
        return result[0]?.total || 0;
    }
}
exports.OrderRepository = OrderRepository;
