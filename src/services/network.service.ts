import { NetworkRepository } from '../repositories/network.repository';
import { INetwork } from '../models/network.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ErrorCode } from '../types';

export class NetworkService {
  private networkRepo: NetworkRepository;

  constructor() {
    this.networkRepo = new NetworkRepository();
  }

  async getAll(activeOnly = false): Promise<INetwork[]> {
    return this.networkRepo.findAll(activeOnly);
  }

  async getById(id: string): Promise<INetwork> {
    const network = await this.networkRepo.findById(id);
    if (!network) {
      throw new NotFoundError('الشبكة المطلوبة غير موجودة', ErrorCode.NETWORK_DISABLED);
    }
    return network;
  }

  async create(data: Partial<INetwork>): Promise<INetwork> {
    if (data.code) {
      const existing = await this.networkRepo.findByCode(data.code);
      if (existing) {
        throw new ConflictError('رمز الشبكة موجود مسبقاً');
      }
    }
    return this.networkRepo.create(data);
  }

  async update(id: string, data: Partial<INetwork>): Promise<INetwork> {
    const updated = await this.networkRepo.updateById(id, data);
    if (!updated) {
      throw new NotFoundError('الشبكة غير موجودة');
    }
    return updated;
  }

  async toggleStatus(id: string, isActive: boolean): Promise<INetwork> {
    return this.update(id, { isActive });
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.networkRepo.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('الشبكة غير موجودة');
    }
  }
}
