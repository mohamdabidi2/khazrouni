import { PackRepository } from '../repositories/pack.repository';
import { NetworkRepository } from '../repositories/network.repository';
import { IPack } from '../models/pack.model';
import { NotFoundError, AppError } from '../utils/errors';
import { ErrorCode } from '../types';

export class PackService {
  private packRepo: PackRepository;
  private networkRepo: NetworkRepository;

  constructor() {
    this.packRepo = new PackRepository();
    this.networkRepo = new NetworkRepository();
  }

  async getAll(activeOnly = false): Promise<IPack[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.packRepo.findAll(filter);
  }

  async getByNetwork(networkId: string, activeOnly = true): Promise<IPack[]> {
    return this.packRepo.findByNetworkId(networkId, activeOnly);
  }

  async getById(id: string): Promise<IPack> {
    const pack = await this.packRepo.findById(id);
    if (!pack) {
      throw new NotFoundError('الباقة المطلوبة غير موجودة', ErrorCode.PACK_NOT_FOUND);
    }
    return pack;
  }

  async create(data: Partial<IPack>): Promise<IPack> {
    if (!data.networkId) {
      throw new AppError('معرف الشبكة مطلوب', 400, ErrorCode.VALIDATION_ERROR);
    }
    const network = await this.networkRepo.findById(data.networkId.toString());
    if (!network) {
      throw new NotFoundError('الشبكة المحددة غير موجودة', ErrorCode.NETWORK_DISABLED);
    }

    return this.packRepo.create(data);
  }

  async update(id: string, data: Partial<IPack>): Promise<IPack> {
    const updated = await this.packRepo.updateById(id, data);
    if (!updated) {
      throw new NotFoundError('الباقة غير موجودة', ErrorCode.PACK_NOT_FOUND);
    }
    return updated;
  }

  async toggleStatus(id: string, isActive: boolean): Promise<IPack> {
    return this.update(id, { isActive });
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.packRepo.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('الباقة غير موجودة', ErrorCode.PACK_NOT_FOUND);
    }
  }
}
