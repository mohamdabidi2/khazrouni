import { Schema, model, Document, Types } from 'mongoose';

export interface INetwork extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  logo: string;
  brandColor?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const networkSchema = new Schema<INetwork>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    logo: {
      type: String,
      required: true
    },
    brandColor: {
      type: String,
      default: '#1E88E5'
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

export const NetworkModel = model<INetwork>('Network', networkSchema);
