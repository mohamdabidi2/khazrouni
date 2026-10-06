import { ClientSession, FilterQuery, UpdateQuery } from 'mongoose';
import { IUser, UserModel } from '../models/user.model';
import { UserRole, UserStatus } from '../types';

export class UserRepository {
  async findById(id: string, session?: ClientSession): Promise<IUser | null> {
    return UserModel.findById(id).session(session || null);
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return UserModel.findOne({ username: username.toLowerCase().trim() });
  }

  async create(userData: Partial<IUser>, session?: ClientSession): Promise<IUser> {
    const user = new UserModel(userData);
    return user.save({ session });
  }

  async updateById(id: string, update: UpdateQuery<IUser>, session?: ClientSession): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, update, { new: true, session });
  }

  async saveFcmToken(userId: string, token: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { fcmToken: token });
  }

  async findByRole(role: string): Promise<IUser[]> {
    return UserModel.find({ role });
  }


  async updateBalance(id: string, amountChange: number, session?: ClientSession): Promise<IUser | null> {
    // Atomic update with min balance condition to prevent negative balance
    const filter: FilterQuery<IUser> = { _id: id };
    if (amountChange < 0) {
      filter.balance = { $gte: Math.abs(amountChange) };
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      filter,
      { $inc: { balance: amountChange } },
      { new: true, session }
    );

    return updatedUser;
  }

  async updateDebt(id: string, debtChange: number, session?: ClientSession): Promise<IUser | null> {
    const filter: FilterQuery<IUser> = { _id: id };
    if (debtChange < 0) {
      filter.debt = { $gte: Math.abs(debtChange) };
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      filter,
      { $inc: { debt: debtChange } },
      { new: true, session }
    );

    return updatedUser;
  }

  async settleDebt(id: string, amount: number, session?: ClientSession): Promise<{ user: IUser; settledAmount: number } | null> {
    const user = await UserModel.findById(id).session(session || null);
    if (!user) return null;

    const currentDebt = user.debt || 0;
    const actualSettled = Math.min(currentDebt, amount);
    const newDebt = Math.max(0, Math.round((currentDebt - actualSettled) * 1000) / 1000);

    user.debt = newDebt;
    await user.save({ session });

    return { user, settledAmount: actualSettled };
  }

  async resetDebt(id: string, session?: ClientSession): Promise<{ user: IUser; clearedAmount: number } | null> {
    const user = await UserModel.findById(id).session(session || null);
    if (!user) return null;

    const clearedAmount = user.debt || 0;
    user.debt = 0;
    await user.save({ session });

    return { user, clearedAmount };
  }

  async findWithPagination(
    filter: FilterQuery<IUser>,
    page: number,
    limit: number
  ): Promise<{ users: IUser[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(filter)
    ]);

    return { users: users as unknown as IUser[], total };
  }

  async count(filter: FilterQuery<IUser> = {}): Promise<number> {
    return UserModel.countDocuments(filter);
  }

  async getTotalClientsBalance(): Promise<number> {
    const result = await UserModel.aggregate([
      { $match: { role: UserRole.CLIENT } },
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
    ]);
    return result[0]?.totalBalance || 0;
  }

  async getTotalClientsDebt(): Promise<number> {
    const result = await UserModel.aggregate([
      { $match: { role: UserRole.CLIENT } },
      { $group: { _id: null, totalDebt: { $sum: '$debt' } } }
    ]);
    return result[0]?.totalDebt || 0;
  }
}
