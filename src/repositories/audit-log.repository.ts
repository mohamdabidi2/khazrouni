import { IAuditLog, AuditLogModel } from '../models/audit-log.model';

export class AuditLogRepository {
  async create(data: Partial<IAuditLog>): Promise<IAuditLog> {
    const log = new AuditLogModel(data);
    return log.save();
  }

  async findRecent(limit = 50): Promise<IAuditLog[]> {
    return AuditLogModel.find()
      .populate('adminId', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
