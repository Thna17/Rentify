import mongoose, { Document, Model, Schema } from 'mongoose';

export const USER_ROLES = ['BUYER', 'SELLER', 'ADMIN'] as const;
export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  /**
   * Bumped on password change, password reset, and suspension. Access tokens
   * carry the value they were signed with, so raising it invalidates every
   * token already in circulation for this user — the piece a stateless JWT
   * cannot do on its own.
   */
  token_version: number;
  failed_login_attempts: number;
  locked_until?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password_hash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: USER_ROLES, default: 'BUYER', required: true },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE', required: true },
    email_verified: { type: Boolean, default: false, required: true },
    token_version: { type: Number, default: 0, required: true },
    failed_login_attempts: { type: Number, default: 0, required: true },
    locked_until: { type: Date, default: null },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_document, value) => {
        const serialized = value as Record<string, unknown>;
        delete serialized._id;
        delete serialized.__v;
        delete serialized.password_hash;
        // Internal security bookkeeping — never exposed to clients.
        delete serialized.token_version;
        delete serialized.failed_login_attempts;
        delete serialized.locked_until;
        return value;
      },
    },
  },
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>('User', UserSchema);

export default User;
