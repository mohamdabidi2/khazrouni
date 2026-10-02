"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const announcement_repository_1 = require("../repositories/announcement.repository");
const errors_1 = require("../utils/errors");
const socket_service_1 = require("../sockets/socket.service");
class AnnouncementService {
    announcementRepo;
    constructor() {
        this.announcementRepo = new announcement_repository_1.AnnouncementRepository();
    }
    async getActive() {
        return this.announcementRepo.findActive();
    }
    async getAll() {
        return this.announcementRepo.findAll();
    }
    async create(data) {
        const announcement = await this.announcementRepo.create(data);
        socket_service_1.SocketEmitter.emitToAll('announcement.updated', announcement);
        return announcement;
    }
    async update(id, data) {
        const updated = await this.announcementRepo.updateById(id, data);
        if (!updated) {
            throw new errors_1.NotFoundError('الإعلان غير موجود');
        }
        socket_service_1.SocketEmitter.emitToAll('announcement.updated', updated);
        return updated;
    }
    async delete(id) {
        const deleted = await this.announcementRepo.deleteById(id);
        if (!deleted) {
            throw new errors_1.NotFoundError('الإعلان غير موجود');
        }
        socket_service_1.SocketEmitter.emitToAll('announcement.deleted', { id });
    }
}
exports.AnnouncementService = AnnouncementService;
