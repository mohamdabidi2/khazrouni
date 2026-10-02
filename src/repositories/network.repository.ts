import { INetwork, NetworkModel } from '../models/network.model';

export class NetworkRepository {
  async findAll(activeOnly = false): Promise<INetwork[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return NetworkModel.find(filter).sort({ createdAt: 1 });
  }

  async findById(id: string): Promise<INetwork | null> {
    return NetworkModel.findById(id);
  }

  async findByCode(code: string): Promise<INetwork | null> {
    return NetworkModel.findOne({ code: code.toUpperCase() });
  }

  async create(data: Partial<INetwork>): Promise<INetwork> {
    const network = new NetworkModel(data);
    return network.save();
  }

  async updateById(id: string, data: Partial<INetwork>): Promise<INetwork | null> {
    return NetworkModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id: string): Promise<INetwork | null> {
    return NetworkModel.findByIdAndDelete(id);
  }
}
