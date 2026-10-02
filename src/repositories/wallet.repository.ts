import { ClientSession, FilterQuery } from 'mongoose';
import { IWalletTransaction, WalletTransactionModel } from '../models/wallet-transaction.model';

export class WalletRepository {
  async createTransaction(
    data: Partial<IWalletTransaction>,
    session?: ClientSession
  ): Promise<IWalletTransaction> {
    const tx = new WalletTransactionModel(data);
    return tx.save({ session });
  }

  async findByFinancialOperationId(
    operationId: string,
    session?: ClientSession
  ): Promise<IWalletTransaction | null> {
    return WalletTransactionModel.findOne({ financialOperationId: operationId }).session(session || null);
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: IWalletTransaction[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<IWalletTransaction> = { userId };

    const [transactions, total] = await Promise.all([
      WalletTransactionModel.find(filter)
        .populate('orderId', 'orderNumber status price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransactionModel.countDocuments(filter)
    ]);

    return { transactions: transactions as unknown as IWalletTransaction[], total };
  }

  async findByOrderId(orderId: string): Promise<IWalletTransaction[]> {
    return WalletTransactionModel.find({ orderId }).sort({ createdAt: 1 });
  }
}
