"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        // Do not log sensitive payloads
        const logData = {
            method,
            url: originalUrl,
            status: statusCode,
            duration: `${duration}ms`,
            ip: ip || req.socket.remoteAddress
        };
        if (statusCode >= 400) {
            logger_1.logger.warn(logData, `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
        }
        else {
            logger_1.logger.info(logData, `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
