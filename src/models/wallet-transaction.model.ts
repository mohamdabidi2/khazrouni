import { Schema, model, Document, Types } from 'mongoose';
import { WalletTransactionType } from '../types';

export interface IWalletTransaction extends Document {
  _id: Types.ObjectId;
  transactionId: string;
  financialOperationId?: string;
  userId: Types.ObjectId;
  adminId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: string;
  createdAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    financialOperationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true
    },
    type: {
      type: String,
      enum: Object.values(WalletTransactionType),
      required: true
    },
    amount: {
      type: Number,
      required: true,
      set: (val: number) => Math.round(val * 1000) / 1000
    },
    balanceBefore: {
      type: Number,
      required: true,
      set: (val: number) => Math.round(val * 1000) / 1000
    },
    balanceAfter: {
      type: Number,
      required: true,
      set: (val: number) => Math.round(val * 1000) / 1000
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    reference: {
      type: String,
      trim: true
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

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransactionModel = model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);
