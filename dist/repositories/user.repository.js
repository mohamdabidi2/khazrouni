"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const user_model_1 = require("../models/user.model");
const types_1 = require("../types");
class UserRepository {
    async findById(id, session) {
        return user_model_1.UserModel.findById(id).session(session || null);
    }
    async findByUsername(username) {
        return user_model_1.UserModel.findOne({ username: username.toLowerCase().trim() });
    }
    async create(userData, session) {
        const user = new user_model_1.UserModel(userData);
        return user.save({ session });
    }
    async updateById(id, update, session) {
        return user_model_1.UserModel.findByIdAndUpdate(id, update, { new: true, session });
    }
    async updateBalance(id, amountChange, session) {
        // Atomic update with min balance condition to prevent negative balance
        const filter = { _id: id };
        if (amountChange < 0) {
            filter.balance = { $gte: Math.abs(amountChange) };
        }
        const updatedUser = await user_model_1.UserModel.findOneAndUpdate(filter, { $inc: { balance: amountChange } }, { new: true, session });
        return updatedUser;
    }
    async updateDebt(id, debtChange, session) {
        const filter = { _id: id };
        if (debtChange < 0) {
            filter.debt = { $gte: Math.abs(debtChange) };
        }
        const updatedUser = await user_model_1.UserModel.findOneAndUpdate(filter, { $inc: { debt: debtChange } }, { new: true, session });
        return updatedUser;
    }
    async settleDebt(id, amount, session) {
        const user = await user_model_1.UserModel.findById(id).session(session || null);
        if (!user)
            return null;
        const currentDebt = user.debt || 0;
        const actualSettled = Math.min(currentDebt, amount);
        const newDebt = Math.max(0, Math.round((currentDebt - actualSettled) * 1000) / 1000);
        user.debt = newDebt;
        await user.save({ session });
        return { user, settledAmount: actualSettled };
    }
    async resetDebt(id, session) {
        const user = await user_model_1.UserModel.findById(id).session(session || null);
        if (!user)
            return null;
        const clearedAmount = user.debt || 0;
        user.debt = 0;
        await user.save({ session });
        return { user, clearedAmount };
    }
    async findWithPagination(filter, page, limit) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            user_model_1.UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            user_model_1.UserModel.countDocuments(filter)
        ]);
        return { users: users, total };
    }
    async count(filter = {}) {
        return user_model_1.UserModel.countDocuments(filter);
    }
    async getTotalClientsBalance() {
        const result = await user_model_1.UserModel.aggregate([
            { $match: { role: types_1.UserRole.CLIENT } },
            { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
        ]);
        return result[0]?.totalBalance || 0;
    }
    async getTotalClientsDebt() {
        const result = await user_model_1.UserModel.aggregate([
            { $match: { role: types_1.UserRole.CLIENT } },
            { $group: { _id: null, totalDebt: { $sum: '$debt' } } }
        ]);
        return result[0]?.totalDebt || 0;
    }
}
exports.UserRepository = UserRepository;
