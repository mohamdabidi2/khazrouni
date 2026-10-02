"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenModel = void 0;
const mongoose_1 = require("mongoose");
const refreshTokenSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        required: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    revokedAt: {
        type: Date
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index to auto cleanup
exports.RefreshTokenModel = (0, mongoose_1.model)('RefreshToken', refreshTokenSchema);
