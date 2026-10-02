import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IJwtPayload, UserRole } from '../types';
import { logger } from '../utils/logger';

let ioInstance: Server | null = null;

export const initializeSocket = (server: HttpServer): Server => {
  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      methods: ['GET', 'POST']
    }
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(); // Allow anonymous connection, but without room assignment
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as IJwtPayload;
      socket.data.user = decoded;
      return next();
    } catch {
      return next(); // Continue as unauthenticated or handle accordingly
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as IJwtPayload | undefined;

    if (user) {
      socket.join(`user:${user.userId}`);
      logger.info(`Socket connected for user ${user.username} (id: ${user.userId})`);

      if (user.role === UserRole.ADMIN) {
        socket.join('room:admin');
        logger.info(`Admin ${user.username} joined room:admin`);
      }
    } else {
      logger.info(`Anonymous socket client connected: ${socket.id}`);
    }

    socket.on('disconnect', () => {
      // Clean up
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = (): Server | null => ioInstance;

export class SocketEmitter {
  static emitToUser(userId: string, event: string, data: unknown) {
    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit(event, data);
    }
  }

  static emitToAdmin(event: string, data: unknown) {
    if (ioInstance) {
      ioInstance.to('room:admin').emit(event, data);
    }
  }

  static emitToAll(event: string, data: unknown) {
    if (ioInstance) {
      ioInstance.emit(event, data);
    }
  }
}
