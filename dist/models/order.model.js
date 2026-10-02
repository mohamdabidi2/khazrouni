"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderModel = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const timelineEventSchema = new mongoose_1.Schema({
    status: {
        type: String,
        enum: Object.values(types_1.OrderStatus),
        required: true
    },
    message: {
        type: String,
        required: true
    },
    actorType: {
        type: String,
        enum: ['CLIENT', 'ADMIN', 'SYSTEM'],
        required: true
    },
    actorId: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });
const orderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    clientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    packId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Pack',
        required: true
    },
    networkId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Network',
        required: true
    },
    beneficiaryNumber: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    packNameSnapshot: {
        type: String,
        required: true
    },
    networkNameSnapshot: {
        type: String,
        required: true
    },
    dataAmountSnapshot: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        set: (val) => Math.round(val * 1000) / 1000
    },
    status: {
        type: String,
        enum: Object.values(types_1.OrderStatus),
        default: types_1.OrderStatus.PENDING,
        index: true
    },
    timeline: [timelineEventSchema],
    confirmedAt: Date,
    cancelledAt: Date,
    completedAt: Date,
    rejectedAt: Date,
    processedAt: Date,
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (_, ret) => {
            delete ret.__v;
            return ret;
        }
    }
});
orderSchema.index({ clientId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
exports.OrderModel = (0, mongoose_1.model)('Order', orderSchema);
