"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogRepository = void 0;
const audit_log_model_1 = require("../models/audit-log.model");
class AuditLogRepository {
    async create(data) {
        const log = new audit_log_model_1.AuditLogModel(data);
        return log.save();
    }
    async findRecent(limit = 50) {
        return audit_log_model_1.AuditLogModel.find()
            .populate('adminId', 'fullName username')
            .sort({ createdAt: -1 })
            .limit(limit);
    }
}
exports.AuditLogRepository = AuditLogRepository;
