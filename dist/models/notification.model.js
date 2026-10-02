"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const notificationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: Object.values(types_1.NotificationType),
        default: types_1.NotificationType.SYSTEM
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
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
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
exports.NotificationModel = (0, mongoose_1.model)('Notification', notificationSchema);
