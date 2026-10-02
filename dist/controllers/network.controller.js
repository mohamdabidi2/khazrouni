"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkController = void 0;
const network_service_1 = require("../services/network.service");
const response_1 = require("../utils/response");
class NetworkController {
    networkService;
    constructor() {
        this.networkService = new network_service_1.NetworkService();
    }
    getAll = async (req, res, next) => {
        try {
            const activeOnly = req.query.activeOnly === 'true';
            const networks = await this.networkService.getAll(activeOnly);
            return response_1.ApiResponse.success(res, networks, 'تم جلب الشبكات بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    getById = async (req, res, next) => {
        try {
            const network = await this.networkService.getById(req.params.id);
            return response_1.ApiResponse.success(res, network);
        }
        catch (error) {
            next(error);
        }
    };
    create = async (req, res, next) => {
        try {
            const network = await this.networkService.create(req.body);
            return response_1.ApiResponse.success(res, network, 'تمت إضافة الشبكة بنجاح', 201);
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            const network = await this.networkService.update(req.params.id, req.body);
            return response_1.ApiResponse.success(res, network, 'تم تعديل الشبكة بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
    toggleStatus = async (req, res, next) => {
        try {
            const { isActive } = req.body;
            const network = await this.networkService.toggleStatus(req.params.id, Boolean(isActive));
            return response_1.ApiResponse.success(res, network, 'تم تحديث حالة الشبكة');
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            await this.networkService.delete(req.params.id);
            return response_1.ApiResponse.success(res, null, 'تم حذف الشبكة بنجاح');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.NetworkController = NetworkController;
