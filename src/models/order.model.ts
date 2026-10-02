import { Schema, model, Document, Types } from 'mongoose';
import { OrderStatus, OrderTimelineEvent } from '../types';

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  clientId: Types.ObjectId;
  packId: Types.ObjectId;
  networkId: Types.ObjectId;
  beneficiaryNumber: string;
  packNameSnapshot: string;
  networkNameSnapshot: string;
  dataAmountSnapshot: string;
  price: number;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  confirmedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
  processedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const timelineEventSchema = new Schema<OrderTimelineEvent>(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true
    },
    message: {
      type: String,
      required: true
    },
    actorType: {
      type: String,
      enum: ['CLIENT', 'ADMIN', 'SYSTEM'],
      required: true
    },
    actorId: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    packId: {
      type: Schema.Types.ObjectId,
      ref: 'Pack',
      required: true
    },
    networkId: {
      type: Schema.Types.ObjectId,
      ref: 'Network',
      required: true
    },
    beneficiaryNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    packNameSnapshot: {
      type: String,
      required: true
    },
    networkNameSnapshot: {
      type: String,
      required: true
    },
    dataAmountSnapshot: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      set: (val: number) => Math.round(val * 1000) / 1000
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true
    },
    timeline: [timelineEventSchema],
    confirmedAt: Date,
    cancelledAt: Date,
    completedAt: Date,
    rejectedAt: Date,
    processedAt: Date,
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
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

orderSchema.index({ clientId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

export const OrderModel = model<IOrder>('Order', orderSchema);
