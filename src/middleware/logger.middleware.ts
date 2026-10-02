import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
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
      logger.warn(logData, `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    } else {
      logger.info(logData, `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    }
  });

  next();
};
