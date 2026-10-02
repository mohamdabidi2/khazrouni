"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    static success(res, data, message = 'تمت العملية بنجاح', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            ...(data !== undefined ? { data } : {})
        });
    }
    static paginated(res, items, page, limit, total, message = 'تم جلب البيانات بنجاح') {
        const totalPages = Math.ceil(total / limit) || 1;
        const responsePayload = {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
        return res.status(200).json({
            success: true,
            message,
            data: responsePayload
        });
    }
    static error(res, message, code, statusCode = 400, details) {
        return res.status(statusCode).json({
            success: false,
            message,
            code,
            ...(details !== undefined ? { details } : {})
        });
    }
}
exports.ApiResponse = ApiResponse;
