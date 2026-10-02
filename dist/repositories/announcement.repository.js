"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementRepository = void 0;
const announcement_model_1 = require("../models/announcement.model");
class AnnouncementRepository {
    async findActive() {
        return announcement_model_1.AnnouncementModel.find({ isActive: true }).sort({ createdAt: -1 });
    }
    async findLatestActive() {
        return announcement_model_1.AnnouncementModel.findOne({ isActive: true }).sort({ createdAt: -1 });
    }
    async findAll() {
        return announcement_model_1.AnnouncementModel.find().sort({ createdAt: -1 });
    }
    async findById(id) {
        return announcement_model_1.AnnouncementModel.findById(id);
    }
    async create(data) {
        const announcement = new announcement_model_1.AnnouncementModel(data);
        return announcement.save();
    }
    async updateById(id, data) {
        return announcement_model_1.AnnouncementModel.findByIdAndUpdate(id, data, { new: true });
    }
    async deleteById(id) {
        return announcement_model_1.AnnouncementModel.findByIdAndDelete(id);
    }
}
exports.AnnouncementRepository = AnnouncementRepository;
