"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInTransaction = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const runInTransaction = async (operation) => {
    // Check if replica set is active
    const isReplicaSet = Boolean(mongoose_1.default.connection.db?.admin &&
        (mongoose_1.default.connection.readyState === 1));
    let session;
    try {
        session = await mongoose_1.default.startSession();
    }
    catch (err) {
        logger_1.logger.warn('Could not start MongoDB session, executing without transaction session.');
        return operation(undefined);
    }
    try {
        let result;
        try {
            await session.withTransaction(async () => {
                result = await operation(session);
            });
            return result;
        }
        catch (txError) {
            // If error indicates standalone MongoDB does not support transactions
            const errorMsg = txError?.message || '';
            if (errorMsg.includes('Transaction numbers are only allowed on a replica set member') ||
                errorMsg.includes('replica set')) {
                logger_1.logger.warn('Standalone MongoDB detected (no replica set). Executing without transaction.');
                return await operation(undefined);
            }
            throw txError;
        }
    }
    finally {
        await session.endSession();
    }
};
exports.runInTransaction = runInTransaction;
