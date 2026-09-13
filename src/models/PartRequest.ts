import mongoose, { Schema, Model, Types } from 'mongoose';

// 1. Part Categories & Condition Preferences
export type PartCategory =
    | 'ENGINE'
    | 'SUSPENSION'
    | 'BRAKES'
    | 'TRANSMISSION'
    | 'BODY'
    | 'ELECTRICAL'
    | 'FILTERS_SERVICE'
    | 'COOLING'
    | 'EXHAUST'
    | 'OTHER';

export type PartConditionPreference = 
    | 'GENUINE_NEW'
    | 'OEM_MATCH'
    | 'AFTERMARKET'
    | 'USED_TESTED'
    | 'ANY';

export type PartUrgency = 'CRITICAL_BREAKDOWN' | 'WITHIN_WEEK' | 'FLEXIBLE';

export type FulfillmentType = 
    | 'PICKUP'
    | 'DELIVERY_NAIROBI'
    | 'UPCOUNTRY_PARCEL'
    | 'FLEXIBLE';

export type PartRequestStatus =  'OPEN' | 'QUOTED' | 'ACCEPTED' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

// 2. TypeScript Interface
export interface IPartRequest {
  requester: Types.ObjectId;             // User who needs the part (owner or garage)
  vehicle: Types.ObjectId;               // Linked vehicle for accurate specs (make/model/engine)
  partName: string;                      // e.g. "Front Shock Absorbers", "Spark Plugs"
  category: PartCategory;
  quantity: number;                      // Eliminates the "single plug vs set of 4" trap!
  oemPartNumber?: string;                // Optional OEM code e.g. "04465-42190"
  preference: PartConditionPreference;
  urgency: PartUrgency;
  fulfillmentType: FulfillmentType;      // Pickup on Kirinyaga Rd, Nairobi Rider, or Upcountry Matatu Parcel
  deliveryLocation?: string;             // e.g. "Nairobi - Westlands" or "Eldoret Town"
  description?: string;                  // Notes on symptoms, side of car (Left/Right)
  photos: string[];                      // Photos of broken part or sample part (Cloudinary URLs)
  status: PartRequestStatus;
  quotesCount: number;                   // Tracks how many dealers submitted bids
  expiresAt: Date;                       // Auto-expires if no deal made (default: 7 days)
  createdAt: Date;
  updatedAt: Date;
}

// 3. Mongoose Schema
const partRequestSchema = new Schema<IPartRequest>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Part request must have a requester'],
      index: true,
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Part request must be linked to a vehicle'],
      index: true,
    },
    partName: {
      type: String,
      required: [true, 'Please specify the part name'],
      trim: true,
      maxlength: [150, 'Part name cannot exceed 150 characters'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'ENGINE',
          'SUSPENSION',
          'BRAKES',
          'TRANSMISSION',
          'BODY',
          'ELECTRICAL',
          'FILTERS_SERVICE',
          'COOLING',
          'EXHAUST',
          'OTHER',
        ],
        message: '{VALUE} is not a recognized spare part category',
      },
      required: [true, 'Please select a part category'],
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    oemPartNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    preference: {
      type: String,
      enum: {
        values: ['GENUINE_NEW', 'OEM_MATCH', 'AFTERMARKET', 'USED_TESTED', 'ANY'],
        message: '{VALUE} is not a valid condition preference',
      },
      default: 'ANY',
    },
    urgency: {
      type: String,
      enum: {
        values: ['CRITICAL_BREAKDOWN', 'WITHIN_WEEK', 'FLEXIBLE'],
        message: '{VALUE} is not a recognized urgency level',
      },
      default: 'WITHIN_WEEK',
    },
    fulfillmentType: {
      type: String,
      enum: {
        values: ['PICKUP', 'DELIVERY_NAIROBI', 'UPCOUNTRY_PARCEL', 'FLEXIBLE'],
        message: '{VALUE} is not a supported fulfillment option',
      },
      default: 'FLEXIBLE',
    },
    deliveryLocation: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    photos: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['OPEN', 'QUOTED', 'ACCEPTED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
      default: 'OPEN',
      index: true,
    },
    quotesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    },
  },
  {
    timestamps: true,
  }
);
// Compound Index: Dealers can rapidly query open requests by category and date
partRequestSchema.index({ status: 1, category: 1, createdAt: -1 });
export const PartRequest: Model<IPartRequest> = mongoose.model<IPartRequest>(
  'PartRequest',
  partRequestSchema
);
export default PartRequest;