"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRepository = void 0;
const wallet_transaction_model_1 = require("../models/wallet-transaction.model");
class WalletRepository {
    async createTransaction(data, session) {
        const tx = new wallet_transaction_model_1.WalletTransactionModel(data);
        return tx.save({ session });
    }
    async findByFinancialOperationId(operationId, session) {
        return wallet_transaction_model_1.WalletTransactionModel.findOne({ financialOperationId: operationId }).session(session || null);
    }
    async findByUserId(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const filter = { userId };
        const [transactions, total] = await Promise.all([
            wallet_transaction_model_1.WalletTransactionModel.find(filter)
                .populate('orderId', 'orderNumber status price')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            wallet_transaction_model_1.WalletTransactionModel.countDocuments(filter)
        ]);
        return { transactions: transactions, total };
    }
    async findByOrderId(orderId) {
        return wallet_transaction_model_1.WalletTransactionModel.find({ orderId }).sort({ createdAt: 1 });
    }
}
exports.WalletRepository = WalletRepository;
