import mongoose, { Schema, Model, Types } from 'mongoose';

// 1. Quote Enums
export type QuotePartCondition =
  | 'GENUINE_NEW'
  | 'OEM_MATCH'
  | 'AFTERMARKET'
  | 'USED_TESTED';

export type PartAvailability =
  | 'IN_STOCK_COLLECT'
  | 'SAME_DAY_DELIVERY'
  | '1_TO_3_DAYS';

export type PartQuoteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// 2. TypeScript Interface
export interface IPartQuote {
  partRequest: Types.ObjectId;       // Linked to the specific RFQ
  dealer: Types.ObjectId;            // The spare-parts shop or vendor
  brandOffered: string;              // e.g. "Brembo", "Denso", "KYB", "Toyota Genuine"
  condition: QuotePartCondition;     // Genuine, OEM, Aftermarket, or Clean Scrap
  priceKes: number;                  // TOTAL price in KES for the full requested quantity
  warrantyDays: number;              // 0 if as-is, 30, 90, 180 days
  availability: PartAvailability;    // In stock right now, rider delivery, or 1-3 days
  partPhotoUrl?: string;             // Proof of physical stock on shelf (Anti-Ghost Broker!)
  notes?: string;                    // e.g. "Includes mounting hardware kit"
  validUntil: Date;                  // THE 48-HOUR PRICE LOCK GUARANTEE
  status: PartQuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 3. Mongoose Schema
const partQuoteSchema = new Schema<IPartQuote>(
  {
    partRequest: {
      type: Schema.Types.ObjectId,
      ref: 'PartRequest',
      required: [true, 'Quote must be linked to a part request'],
      index: true,
    },
    dealer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Quote must have an authorized dealer'],
      index: true,
    },
    brandOffered: {
      type: String,
      required: [true, 'Please specify the brand of the part offered'],
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
    },
    condition: {
      type: String,
      enum: {
        values: ['GENUINE_NEW', 'OEM_MATCH', 'AFTERMARKET', 'USED_TESTED'],
        message: '{VALUE} is not an authorized part condition',
      },
      required: [true, 'Please specify the condition of the part'],
    },
    priceKes: {
      type: Number,
      required: [true, 'Please provide the total locked price in KES for the requested quantity'],
      min: [1, 'Price must be greater than zero'],
    },
    warrantyDays: {
      type: Number,
      default: 0, // 0 = No warranty (used/scrap parts), 30+ for new
      min: [0, 'Warranty days cannot be negative'],
    },
    availability: {
      type: String,
      enum: {
        values: ['IN_STOCK_COLLECT', 'SAME_DAY_DELIVERY', '1_TO_3_DAYS'],
        message: '{VALUE} is not a valid availability option',
      },
      default: 'IN_STOCK_COLLECT',
    },
    partPhotoUrl: {
      type: String,
      trim: true, // Cloudinary photo of actual part on shelf
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    validUntil: {
      type: Date,
      // Automatically locks in the price for 48 hours from submission
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Quickly fetch quotes for an RFQ, sorted by price (cheapest first)
partQuoteSchema.index({ partRequest: 1, priceKes: 1 });

export const PartQuote: Model<IPartQuote> = mongoose.model<IPartQuote>(
  'PartQuote',
  partQuoteSchema
);
export default PartQuote;
