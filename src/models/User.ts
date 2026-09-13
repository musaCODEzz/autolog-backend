import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { formatKenyanPhone } from '../utils/phone';

// roles on AUTOLOG KE
export type UserRole = 'owner' | 'dealer' | 'garage' | 'admin';

// business profile for dealers and garages

export interface IBusinessDetails {
  businessName?: string;
  location?: string;
  isVerifiedPartner?: boolean;
  rating?: number;
  totalReviews?: number;
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  businessDetails?: IBusinessDetails;
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Please provide a Kenyan phone number'],
      unique: true,
      trim: true,
      set: formatKenyanPhone, // Auto-formats any Kenyan number to +254...
      match: [
        /^\+254[17]\d{8}$/,
        'Invalid Kenyan phone format. Expected: +2547XXXXXXXX or +2541XXXXXXXX',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Automatically hides password from query results
    },
    role: {
      type: String,
      enum: {
        values: ['owner', 'dealer', 'garage', 'admin'],
        message: '{VALUE} is not an authorized AutoLog role',
      },
      default: 'owner',
    },
    businessDetails: {
      businessName: { type: String, trim: true },
      location: { type: String, trim: true },
      isVerifiedPartner: { type: Boolean, default: false },
      rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
      totalReviews: { type: Number, default: 0 },
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Pre-save hook: Hashes password before saving if modified
userSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

});
// Instance Method: Safely verifies candidate password against stored bcrypt hash
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};
// 5. Model Export
export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
