"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const userSchema = new mongoose_1.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: Object.values(types_1.UserRole),
        default: types_1.UserRole.CLIENT,
        index: true
    },
    status: {
        type: String,
        enum: Object.values(types_1.UserStatus),
        default: types_1.UserStatus.PENDING,
        index: true
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'لا يمكن أن يكون الرصيد سالبًا'],
        set: (val) => Math.round(val * 1000) / 1000 // Handle millimes precision (3 decimal places)
    },
    debt: {
        type: Number,
        default: 0,
        min: [0, 'لا يمكن أن يكون الدين سالبًا'],
        set: (val) => Math.round(val * 1000) / 1000
    },
    lastLoginAt: {
        type: Date
    },
    fcmToken: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (_, ret) => {
            delete ret.passwordHash;
            delete ret.__v;
            return ret;
        }
    }
});
exports.UserModel = (0, mongoose_1.model)('User', userSchema);
