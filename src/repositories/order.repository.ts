import { ClientSession, FilterQuery, UpdateQuery } from 'mongoose';
import { IOrder, OrderModel } from '../models/order.model';
import { OrderStatus } from '../types';

export class OrderRepository {
  async findById(id: string, session?: ClientSession): Promise<IOrder | null> {
    return OrderModel.findById(id)
      .populate('clientId', 'fullName username balance status')
      .populate('networkId', 'name code logo brandColor')
      .populate('packId', 'name dataAmount price')
      .session(session || null);
  }

  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return OrderModel.findOne({ orderNumber })
      .populate('clientId', 'fullName username balance')
      .populate('networkId', 'name code logo brandColor')
      .populate('packId', 'name dataAmount price');
  }

  async create(orderData: Partial<IOrder>, session?: ClientSession): Promise<IOrder> {
    const order = new OrderModel(orderData);
    return order.save({ session });
  }

  async updateById(id: string, update: UpdateQuery<IOrder>, session?: ClientSession): Promise<IOrder | null> {
    return OrderModel.findByIdAndUpdate(id, update, { new: true, session });
  }

  async findWithPagination(
    filter: FilterQuery<IOrder>,
    page: number,
    limit: number
  ): Promise<{ orders: IOrder[]; total: number }> {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .populate('clientId', 'fullName username balance')
        .populate('networkId', 'name code logo brandColor')
        .populate('packId', 'name dataAmount price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrderModel.countDocuments(filter)
    ]);

    return { orders: orders as unknown as IOrder[], total };
  }

  async count(filter: FilterQuery<IOrder> = {}): Promise<number> {
    return OrderModel.countDocuments(filter);
  }

  async getRecentOrders(clientId?: string, limit = 5): Promise<IOrder[]> {
    const filter = clientId ? { clientId } : {};
    return OrderModel.find(filter)
      .populate('clientId', 'fullName username')
      .populate('networkId', 'name code logo brandColor')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getTodayRevenue(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await OrderModel.aggregate([
      {
        $match: {
          status: { $in: [OrderStatus.COMPLETED, OrderStatus.PROCESSING, OrderStatus.CONFIRMED] },
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

  async getTotalRevenue(): Promise<number> {
    const result = await OrderModel.aggregate([
      {
        $match: {
          status: { $in: [OrderStatus.COMPLETED, OrderStatus.PROCESSING, OrderStatus.CONFIRMED] }
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
