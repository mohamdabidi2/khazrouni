import { FilterQuery, Types } from 'mongoose';
import { IPack, PackModel } from '../models/pack.model';

export class PackRepository {
  async findAll(filter: FilterQuery<IPack> = {}): Promise<IPack[]> {
    return PackModel.find(filter).populate('networkId', 'name code logo brandColor').sort({ price: 1 });
  }

  async findByNetworkId(networkId: string, activeOnly = true): Promise<IPack[]> {
    const filter: FilterQuery<IPack> = { networkId: new Types.ObjectId(networkId) };
    if (activeOnly) {
      filter.isActive = true;
    }
    return PackModel.find(filter).populate('networkId', 'name code logo brandColor').sort({ price: 1 });
  }

  async findById(id: string): Promise<IPack | null> {
    return PackModel.findById(id).populate('networkId', 'name code logo brandColor isActive');
  }

  async create(data: Partial<IPack>): Promise<IPack> {
    const pack = new PackModel(data);
    return pack.save();
  }

  async updateById(id: string, data: Partial<IPack>): Promise<IPack | null> {
    return PackModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id: string): Promise<IPack | null> {
    return PackModel.findByIdAndDelete(id);
  }

  async countByNetwork(): Promise<{ networkId: string; count: number }[]> {
    return PackModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$networkId', count: { $sum: 1 } } },
      { $project: { networkId: '$_id', count: 1, _id: 0 } }
    ]);
  }
}
