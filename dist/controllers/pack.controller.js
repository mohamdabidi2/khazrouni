"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackController = void 0;
const pack_service_1 = require("../services/pack.service");
const response_1 = require("../utils/response");
class PackController {
    packService;
    constructor() {
        this.packService = new pack_service_1.PackService();
    }
    getAll = async (req, res, next) => {
        try {
            const networkId = req.query.networkId;
            const activeOnly = req.query.activeOnly !== 'false';
            let packs;
            if (networkId) {
                packs = await this.packService.getByNetwork(networkId, activeOnly);
            }
            else {
                packs = await this.packService.getAll(activeOnly);
            }
            return response_1.ApiResponse.success(res, packs, 'تم جلب الباقات بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    getById = async (req, res, next) => {
        try {
            const pack = await this.packService.getById(req.params.id);
            return response_1.ApiResponse.success(res, pack);
        }
        catch (error) {
            next(error);
        }
    };
    create = async (req, res, next) => {
        try {
            const pack = await this.packService.create(req.body);
            return response_1.ApiResponse.success(res, pack, 'تمت إضافة الباقة بنجاح', 201);
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            const pack = await this.packService.update(req.params.id, req.body);
            return response_1.ApiResponse.success(res, pack, 'تم تعديل الباقة بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    toggleStatus = async (req, res, next) => {
        try {
            const { isActive } = req.body;
            const pack = await this.packService.toggleStatus(req.params.id, Boolean(isActive));
            return response_1.ApiResponse.success(res, pack, 'تم تحديث حالة الباقة');
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            await this.packService.delete(req.params.id);
            return response_1.ApiResponse.success(res, null, 'تم حذف الباقة بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.PackController = PackController;
