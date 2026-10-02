import { Schema, model, Document, Types } from 'mongoose';
import { AuditAction } from '../types';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
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
      type: Schema.Types.Mixed,
      default: {}
    },
    ip: String,
    userAgent: String
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
