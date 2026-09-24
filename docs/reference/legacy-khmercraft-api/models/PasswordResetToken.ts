import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IPasswordResetToken extends Document {
  user_id: Types.ObjectId;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token_hash: { type: String, required: true, unique: true, index: true },
    expires_at: { type: Date, required: true, expires: 0 },
  },
  {
    collection: 'password_reset_tokens',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

const PasswordResetToken: Model<IPasswordResetToken> =
  (mongoose.models.PasswordResetToken as
    | Model<IPasswordResetToken>
    | undefined) ??
  mongoose.model<IPasswordResetToken>(
    'PasswordResetToken',
    PasswordResetTokenSchema,
  );

export default PasswordResetToken;
