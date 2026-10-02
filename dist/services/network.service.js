"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkService = void 0;
const network_repository_1 = require("../repositories/network.repository");
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
class NetworkService {
    networkRepo;
    constructor() {
        this.networkRepo = new network_repository_1.NetworkRepository();
    }
    async getAll(activeOnly = false) {
        return this.networkRepo.findAll(activeOnly);
    }
    async getById(id) {
        const network = await this.networkRepo.findById(id);
        if (!network) {
            throw new errors_1.NotFoundError('الشبكة المطلوبة غير موجودة', types_1.ErrorCode.NETWORK_DISABLED);
        }
        return network;
    }
    async create(data) {
        if (data.code) {
            const existing = await this.networkRepo.findByCode(data.code);
            if (existing) {
                throw new errors_1.ConflictError('رمز الشبكة موجود مسبقاً');
            }
        }
        return this.networkRepo.create(data);
    }
    async update(id, data) {
        const updated = await this.networkRepo.updateById(id, data);
        if (!updated) {
            throw new errors_1.NotFoundError('الشبكة غير موجودة');
        }
        return updated;
    }
    async toggleStatus(id, isActive) {
        return this.update(id, { isActive });
    }
    async delete(id) {
        const deleted = await this.networkRepo.deleteById(id);
        if (!deleted) {
            throw new errors_1.NotFoundError('الشبكة غير موجودة');
        }
    }
}
exports.NetworkService = NetworkService;
