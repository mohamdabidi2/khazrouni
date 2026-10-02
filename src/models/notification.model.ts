import { Schema, model, Document, Types } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
      enum: Object.values(NotificationType),
      default: NotificationType.SYSTEM
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = model<INotification>('Notification', notificationSchema);
