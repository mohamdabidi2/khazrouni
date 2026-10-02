"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEmitter = exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
let ioInstance = null;
const initializeSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.env.CORS_ORIGIN === '*' ? true : env_1.env.CORS_ORIGIN,
            methods: ['GET', 'POST']
        }
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(); // Allow anonymous connection, but without room assignment
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            socket.data.user = decoded;
            return next();
        }
        catch {
            return next(); // Continue as unauthenticated or handle accordingly
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        if (user) {
            socket.join(`user:${user.userId}`);
            logger_1.logger.info(`Socket connected for user ${user.username} (id: ${user.userId})`);
            if (user.role === types_1.UserRole.ADMIN) {
                socket.join('room:admin');
                logger_1.logger.info(`Admin ${user.username} joined room:admin`);
            }
        }
        else {
            logger_1.logger.info(`Anonymous socket client connected: ${socket.id}`);
        }
        socket.on('disconnect', () => {
            // Clean up
        });
    });
    ioInstance = io;
    return io;
};
exports.initializeSocket = initializeSocket;
const getIO = () => ioInstance;
exports.getIO = getIO;
class SocketEmitter {
    static emitToUser(userId, event, data) {
        if (ioInstance) {
            ioInstance.to(`user:${userId}`).emit(event, data);
        }
    }
    static emitToAdmin(event, data) {
        if (ioInstance) {
            ioInstance.to('room:admin').emit(event, data);
        }
    }
    static emitToAll(event, data) {
        if (ioInstance) {
            ioInstance.emit(event, data);
        }
    }
}
exports.SocketEmitter = SocketEmitter;
