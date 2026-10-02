"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackService = void 0;
const pack_repository_1 = require("../repositories/pack.repository");
const network_repository_1 = require("../repositories/network.repository");
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
class PackService {
    packRepo;
    networkRepo;
    constructor() {
        this.packRepo = new pack_repository_1.PackRepository();
        this.networkRepo = new network_repository_1.NetworkRepository();
    }
    async getAll(activeOnly = false) {
        const filter = activeOnly ? { isActive: true } : {};
        return this.packRepo.findAll(filter);
    }
    async getByNetwork(networkId, activeOnly = true) {
        return this.packRepo.findByNetworkId(networkId, activeOnly);
    }
    async getById(id) {
        const pack = await this.packRepo.findById(id);
        if (!pack) {
            throw new errors_1.NotFoundError('الباقة المطلوبة غير موجودة', types_1.ErrorCode.PACK_NOT_FOUND);
        }
        return pack;
    }
    async create(data) {
        if (!data.networkId) {
            throw new errors_1.AppError('معرف الشبكة مطلوب', 400, types_1.ErrorCode.VALIDATION_ERROR);
        }
        const network = await this.networkRepo.findById(data.networkId.toString());
        if (!network) {
            throw new errors_1.NotFoundError('الشبكة المحددة غير موجودة', types_1.ErrorCode.NETWORK_DISABLED);
        }
        return this.packRepo.create(data);
    }
    async update(id, data) {
        const updated = await this.packRepo.updateById(id, data);
        if (!updated) {
            throw new errors_1.NotFoundError('الباقة غير موجودة', types_1.ErrorCode.PACK_NOT_FOUND);
        }
        return updated;
    }
    async toggleStatus(id, isActive) {
        return this.update(id, { isActive });
    }
    async delete(id) {
        const deleted = await this.packRepo.deleteById(id);
        if (!deleted) {
            throw new errors_1.NotFoundError('الباقة غير موجودة', types_1.ErrorCode.PACK_NOT_FOUND);
        }
    }
}
exports.PackService = PackService;
