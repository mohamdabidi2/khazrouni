import { Schema, model, Document, Types } from 'mongoose';
import { UserRole, UserStatus } from '../types';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  balance: number;
  debt: number;
  lastLoginAt?: Date;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
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
      enum: Object.values(UserRole),
      default: UserRole.CLIENT,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
      index: true
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'لا يمكن أن يكون الرصيد سالبًا'],
      set: (val: number) => Math.round(val * 1000) / 1000 // Handle millimes precision (3 decimal places)
    },
    debt: {
      type: Number,
      default: 0,
      min: [0, 'لا يمكن أن يكون الدين سالبًا'],
      set: (val: number) => Math.round(val * 1000) / 1000
    },
    lastLoginAt: {
      type: Date
    },
    fcmToken: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const UserModel = model<IUser>('User', userSchema);
