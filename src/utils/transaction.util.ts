import mongoose, { ClientSession } from 'mongoose';
import { logger } from './logger';

export const runInTransaction = async <T>(
  operation: (session?: ClientSession) => Promise<T>
): Promise<T> => {
  // Check if replica set is active
  const isReplicaSet = Boolean(
    mongoose.connection.db?.admin &&
    (mongoose.connection.readyState === 1)
  );

  let session: ClientSession | undefined;

  try {
    session = await mongoose.startSession();
  } catch (err) {
    logger.warn('Could not start MongoDB session, executing without transaction session.');
    return operation(undefined);
  }

  try {
    let result: T;
    try {
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result!;
    } catch (txError: unknown) {
      // If error indicates standalone MongoDB does not support transactions
      const errorMsg = (txError as Error)?.message || '';
      if (
        errorMsg.includes('Transaction numbers are only allowed on a replica set member') ||
        errorMsg.includes('replica set')
      ) {
        logger.warn('Standalone MongoDB detected (no replica set). Executing without transaction.');
        return await operation(undefined);
      }
      throw txError;
    }
  } finally {
    await session.endSession();
  }
};
