"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const database_1 = require("./config/database");
const socket_service_1 = require("./sockets/socket.service");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const startServer = async () => {
    try {
        // 1. Connect to MongoDB
        await (0, database_1.connectDatabase)();
        // 2. Create Express app & HTTP Server
        const app = (0, app_1.createApp)();
        const server = http_1.default.createServer(app);
        // 3. Initialize Socket.IO
        (0, socket_service_1.initializeSocket)(server);
        // 4. Start listening
        server.listen(env_1.env.PORT, () => {
            logger_1.logger.info(`=======================================================`);
            logger_1.logger.info(`🚀 Khazrouni Giga Server started on port: ${env_1.env.PORT}`);
            logger_1.logger.info(`📚 Swagger Docs: http://localhost:${env_1.env.PORT}/api/docs`);
            logger_1.logger.info(`🩺 Health Check: http://localhost:${env_1.env.PORT}/health`);
            logger_1.logger.info(`Environment: ${env_1.env.NODE_ENV}`);
            logger_1.logger.info(`=======================================================`);
        });
        // Graceful Shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                logger_1.logger.info('HTTP server closed.');
                await (0, database_1.disconnectDatabase)();
                process.exit(0);
            });
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }
    catch (error) {
        logger_1.logger.error({ error }, '❌ Failed to start server');
        process.exit(1);
    }
};
startServer();
