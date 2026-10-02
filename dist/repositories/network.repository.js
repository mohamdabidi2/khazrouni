"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkRepository = void 0;
const network_model_1 = require("../models/network.model");
class NetworkRepository {
    async findAll(activeOnly = false) {
        const filter = activeOnly ? { isActive: true } : {};
        return network_model_1.NetworkModel.find(filter).sort({ createdAt: 1 });
    }
    async findById(id) {
        return network_model_1.NetworkModel.findById(id);
    }
    async findByCode(code) {
        return network_model_1.NetworkModel.findOne({ code: code.toUpperCase() });
    }
    async create(data) {
        const network = new network_model_1.NetworkModel(data);
        return network.save();
    }
    async updateById(id, data) {
        return network_model_1.NetworkModel.findByIdAndUpdate(id, data, { new: true });
    }
    async deleteById(id) {
        return network_model_1.NetworkModel.findByIdAndDelete(id);
    }
}
exports.NetworkRepository = NetworkRepository;
