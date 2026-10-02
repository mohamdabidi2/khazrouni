import { Schema, model, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
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
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

announcementSchema.index({ isActive: 1, createdAt: -1 });

export const AnnouncementModel = model<IAnnouncement>('Announcement', announcementSchema);
