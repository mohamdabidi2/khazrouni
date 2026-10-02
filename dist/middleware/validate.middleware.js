"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });
            // Assign parsed values back to request
            if (parsed.body)
                req.body = parsed.body;
            if (parsed.query)
                req.query = parsed.query;
            if (parsed.params)
                req.params = parsed.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.errors.map(err => ({
                    field: err.path.join('.').replace(/^(body|query|params)\./, ''),
                    message: err.message
                }));
                const firstMessage = issues[0]?.message || 'بيانات غير صالحة';
                return next(new errors_1.ValidationError(firstMessage, issues));
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
