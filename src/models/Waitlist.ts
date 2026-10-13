import mongoose, { Document, Schema } from 'mongoose';

export type WaitlistRole = 'CAR_OWNER' | 'GARAGE' | 'PARTS_DEALER' | 'BUYER';

export interface IWaitlist extends Document {
  fullName: string;
  email: string;
  phone: string;
  role: WaitlistRole;
  vehicleInterest?: string;
  // Checklist Item #23: Explicit phone consent for SMS / WhatsApp updates
  phoneConsent: boolean;
  // Checklist Item #30: UTM attribution tracking captured from URL into form
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide your phone number'],
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['CAR_OWNER', 'GARAGE', 'PARTS_DEALER', 'BUYER'],
      default: 'CAR_OWNER',
    },
    vehicleInterest: {
      type: String,
      trim: true,
      maxlength: [120, 'Vehicle details cannot exceed 120 characters'],
    },
    phoneConsent: {
      type: Boolean,
      required: [true, 'Phone consent is required'],
      default: false,
    },
    utmSource: {
      type: String,
      trim: true,
      default: 'direct',
    },
    utmMedium: {
      type: String,
      trim: true,
    },
    utmCampaign: {
      type: String,
      trim: true,
    },
    utmContent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Waitlist = mongoose.model<IWaitlist>('Waitlist', waitlistSchema);
