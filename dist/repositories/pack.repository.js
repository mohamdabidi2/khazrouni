"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackRepository = void 0;
const mongoose_1 = require("mongoose");
const pack_model_1 = require("../models/pack.model");
class PackRepository {
    async findAll(filter = {}) {
        return pack_model_1.PackModel.find(filter).populate('networkId', 'name code logo brandColor').sort({ price: 1 });
    }
    async findByNetworkId(networkId, activeOnly = true) {
        const filter = { networkId: new mongoose_1.Types.ObjectId(networkId) };
        if (activeOnly) {
            filter.isActive = true;
        }
        return pack_model_1.PackModel.find(filter).populate('networkId', 'name code logo brandColor').sort({ price: 1 });
    }
    async findById(id) {
        return pack_model_1.PackModel.findById(id).populate('networkId', 'name code logo brandColor isActive');
    }
    async create(data) {
        const pack = new pack_model_1.PackModel(data);
        return pack.save();
    }
    async updateById(id, data) {
        return pack_model_1.PackModel.findByIdAndUpdate(id, data, { new: true });
    }
    async deleteById(id) {
        return pack_model_1.PackModel.findByIdAndDelete(id);
    }
    async countByNetwork() {
        return pack_model_1.PackModel.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$networkId', count: { $sum: 1 } } },
            { $project: { networkId: '$_id', count: 1, _id: 0 } }
        ]);
    }
}
exports.PackRepository = PackRepository;
