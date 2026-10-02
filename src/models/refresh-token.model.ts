import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index to auto cleanup

export const RefreshTokenModel = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
