import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IEmailVerificationCode extends Document {
  user_id: Types.ObjectId;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  created_at: Date;
}

const EmailVerificationCodeSchema = new Schema<IEmailVerificationCode>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code_hash: { type: String, required: true },
    expires_at: { type: Date, required: true, expires: 0 },
    // Wrong guesses against this specific code, separate from the per-route
    // rate limit — a code is invalidated outright after too many tries rather
    // than just slowing the caller down.
    attempts: { type: Number, default: 0, required: true },
  },
  {
    collection: 'email_verification_codes',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

const EmailVerificationCode: Model<IEmailVerificationCode> =
  (mongoose.models.EmailVerificationCode as
    | Model<IEmailVerificationCode>
    | undefined) ??
  mongoose.model<IEmailVerificationCode>(
    'EmailVerificationCode',
    EmailVerificationCodeSchema,
  );

export default EmailVerificationCode;
