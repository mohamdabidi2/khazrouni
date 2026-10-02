import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let isConnected = false;

export const connectDatabase = async (uri?: string): Promise<typeof mongoose> => {
  const connectionUri = uri || env.MONGO_URI;

  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    logger.info(`✅ MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error({ error }, '❌ MongoDB connection failed');
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  }
};

export const isDbConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
