import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  user_id: Types.ObjectId;
  token_hash: string;
  expires_at: Date;
  revoked_at?: Date;
  replaced_by_hash?: string;
  created_at: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token_hash: { type: String, required: true, unique: true, index: true },
    expires_at: { type: Date, required: true, expires: 0 },
    revoked_at: { type: Date },
    replaced_by_hash: { type: String },
  },
  {
    collection: 'refresh_tokens',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

const RefreshToken: Model<IRefreshToken> =
  (mongoose.models.RefreshToken as Model<IRefreshToken> | undefined) ??
  mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

export default RefreshToken;
