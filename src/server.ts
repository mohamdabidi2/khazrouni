import http from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocket } from './sockets/socket.service';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Create Express app & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.IO
    initializeSocket(server);

    // 4. Start listening
    server.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 Khazrouni Giga Server started on port: ${env.PORT}`);
      logger.info(`📚 Swagger Docs: http://localhost:${env.PORT}/api/docs`);
      logger.info(`🩺 Health Check: http://localhost:${env.PORT}/health`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`=======================================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
};

startServer();
