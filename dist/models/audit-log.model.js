"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogModel = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const auditLogSchema = new mongoose_1.Schema({
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: Object.values(types_1.AuditAction),
        required: true,
        index: true
    },
    entityType: {
        type: String,
        required: true
    },
    entityId: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    ip: String,
    userAgent: String
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
exports.AuditLogModel = (0, mongoose_1.model)('AuditLog', auditLogSchema);
