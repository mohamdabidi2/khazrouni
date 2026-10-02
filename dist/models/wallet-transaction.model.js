"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletTransactionModel = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const walletTransactionSchema = new mongoose_1.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    financialOperationId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        index: true
    },
    type: {
        type: String,
        enum: Object.values(types_1.WalletTransactionType),
        required: true
    },
    amount: {
        type: Number,
        required: true,
        set: (val) => Math.round(val * 1000) / 1000
    },
    balanceBefore: {
        type: Number,
        required: true,
        set: (val) => Math.round(val * 1000) / 1000
    },
    balanceAfter: {
        type: Number,
        required: true,
        set: (val) => Math.round(val * 1000) / 1000
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    reference: {
        type: String,
        trim: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
        transform: (_, ret) => {
            delete ret.__v;
            return ret;
        }
    }
});
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
exports.WalletTransactionModel = (0, mongoose_1.model)('WalletTransaction', walletTransactionSchema);
