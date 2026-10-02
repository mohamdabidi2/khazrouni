import { Schema, model, Document, Types } from 'mongoose';

export interface IPack extends Document {
  _id: Types.ObjectId;
  networkId: Types.ObjectId;
  name: string;
  dataAmount: string;
  price: number;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const packSchema = new Schema<IPack>(
  {
    networkId: {
      type: Schema.Types.ObjectId,
      ref: 'Network',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    dataAmount: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'لا يمكن أن يكون السعر أقل من 0'],
      set: (val: number) => Math.round(val * 1000) / 1000
    },
    description: {
      type: String,
      default: '',
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

packSchema.index({ networkId: 1, isActive: 1 });

export const PackModel = model<IPack>('Pack', packSchema);
