"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementModel = void 0;
const mongoose_1 = require("mongoose");
const announcementSchema = new mongoose_1.Schema({
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
    isActive: {
        type: Boolean,
        default: true,
        index: true
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
announcementSchema.index({ isActive: 1, createdAt: -1 });
exports.AnnouncementModel = (0, mongoose_1.model)('Announcement', announcementSchema);
