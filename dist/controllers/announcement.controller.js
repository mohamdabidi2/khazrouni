"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementController = void 0;
const announcement_service_1 = require("../services/announcement.service");
const response_1 = require("../utils/response");
class AnnouncementController {
    announcementService;
    constructor() {
        this.announcementService = new announcement_service_1.AnnouncementService();
    }
    getActive = async (req, res, next) => {
        try {
            const announcements = await this.announcementService.getActive();
            return response_1.ApiResponse.success(res, announcements, 'تم جلب الإعلانات النشطة');
        }
        catch (error) {
            next(error);
        }
    };
    getAll = async (req, res, next) => {
        try {
            const announcements = await this.announcementService.getAll();
            return response_1.ApiResponse.success(res, announcements, 'تم جلب جميع الإعلانات');
        }
        catch (error) {
            next(error);
        }
    };
    create = async (req, res, next) => {
        try {
            const announcement = await this.announcementService.create(req.body);
            return response_1.ApiResponse.success(res, announcement, 'تم إنشاء الإعلان بنجاح', 201);
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            const announcement = await this.announcementService.update(req.params.id, req.body);
            return response_1.ApiResponse.success(res, announcement, 'تم تعديل الإعلان بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            await this.announcementService.delete(req.params.id);
            return response_1.ApiResponse.success(res, null, 'تم حذف الإعلان بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AnnouncementController = AnnouncementController;
