import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * DRAFT is reserved for a future "save and finish later" form — the current
 * apply flow submits in one step, so every application created today starts
 * at SUBMITTED. UNDER_REVIEW is set by an admin picking it up; SUSPENDED
 * covers a previously-approved seller KhmerCraft has since paused.
 */
export const SELLER_APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
] as const;
export type SellerApplicationStatus = (typeof SELLER_APPLICATION_STATUSES)[number];

export interface ISellerApplication extends Document {
  /**
   * Added on top of the original design: an application with no owner can't
   * be traced back to an account, and made GET /apply safe to expose to
   * anyone since there was nothing tying a row to who submitted it.
   */
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  province: string;
  primaryCategory: string;
  status: SellerApplicationStatus;
  submittedAt: Date;
  /** Set only when an admin has acted on this application. */
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
  /** Internal only — never returned to the applicant. */
  adminNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SellerApplicationSchema = new Schema<ISellerApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 30 },
    province: { type: String, required: true, trim: true, maxlength: 60 },
    primaryCategory: { type: String, required: true, trim: true, maxlength: 80 },
    status: {
      type: String,
      enum: SELLER_APPLICATION_STATUSES,
      default: 'SUBMITTED',
      required: true,
      index: true,
    },
    submittedAt: { type: Date, required: true, default: () => new Date() },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
    adminNotes: { type: String, trim: true, maxlength: 2000, default: null },
  },
  { timestamps: true },
);

// The admin review queue: pending applications, oldest first.
SellerApplicationSchema.index({ status: 1, submittedAt: 1 });

const SellerApplication: Model<ISellerApplication> =
  (mongoose.models.SellerApplication as Model<ISellerApplication>) ||
  mongoose.model<ISellerApplication>('SellerApplication', SellerApplicationSchema);

export default SellerApplication;
