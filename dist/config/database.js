"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDbConnected = exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
let isConnected = false;
const connectDatabase = async (uri) => {
    const connectionUri = uri || env_1.env.MONGO_URI;
    try {
        const conn = await mongoose_1.default.connect(connectionUri, {
            serverSelectionTimeoutMS: 5000,
            autoIndex: true
        });
        isConnected = true;
        logger_1.logger.info(`✅ MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
    }
    catch (error) {
        logger_1.logger.error({ error }, '❌ MongoDB connection failed');
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    if (isConnected) {
        await mongoose_1.default.disconnect();
        isConnected = false;
        logger_1.logger.info('MongoDB disconnected');
    }
};
exports.disconnectDatabase = disconnectDatabase;
const isDbConnected = () => {
    return mongoose_1.default.connection.readyState === 1;
};
exports.isDbConnected = isDbConnected;
