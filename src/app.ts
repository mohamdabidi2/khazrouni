import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { isDbConnected } from './config/database';
import { swaggerDocument } from './docs/swagger';
import { requestLogger } from './middleware/logger.middleware';
import { apiRateLimiter } from './middleware/rate-limiter.middleware';
import { errorHandler } from './middleware/error.middleware';

// Import Routes
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import networkRoutes from './routes/network.routes';
import packRoutes from './routes/pack.routes';
import orderRoutes from './routes/order.routes';
import walletRoutes from './routes/wallet.routes';
import announcementRoutes from './routes/announcement.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';

export const createApp = (): express.Application => {
  const app = express();

  // 1. Security Middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  const corsOptions: cors.CorsOptions = {
    origin: true, // Dynamically echoes request origin, allowing localhost on any port
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // 2. Parsing Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 3. Observability
  app.use(requestLogger);

  // 4. Rate Limiting for general API
  app.use('/api', apiRateLimiter);

  // 5. Health Check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      database: isDbConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  });

  // 6. Swagger API Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // 7. Mount Module Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/client', clientRoutes);
  app.use('/api/networks', networkRoutes);
  app.use('/api/packs', packRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  // 8. 404 Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `المسار ${req.originalUrl} غير موجود`,
      code: 'ROUTE_NOT_FOUND'
    });
  });

  // 9. Central Error Handler
  app.use(errorHandler);

  return app;
};
