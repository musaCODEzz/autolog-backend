import mongoose, { Schema, Model, Types } from 'mongoose';
import { formatKenyanPhone } from '../utils/phone';

// service types common in Kenya

export type ServiceType =
    | 'OIL_CHANGE'
    | 'MAJOR_SERVICE'
    | 'BRAKES'
    | 'SUSPENSION'
    | 'TIRES'
    | 'TRANSMISSION'
    | 'BATTERY'
    | 'ELECTRICAL'
    | 'BODY_PAINT'
    | 'OTHER';

// THREE TIER TRUST BADGE
export type VerificationTier = 'TIER_1_SELF' | 'TIER_2_DOCUMENTED' | 'TIER_3_PARTNER';


// GRANULAR PART BREAKDOWN
export interface IPartItem {
    partName: string;
    brand?: string;        // e.g. "Total Quartz", "Brembo", "Denso", "NGK"
    partNumber?: string;   // e.g. "04152-YZZA6"
    costKes?: number;
}

// 4. TypeScript Interface
export interface IServiceRecord {
    vehicle: Types.ObjectId;
    loggedBy: Types.ObjectId;          // The user who submitted the record (owner or garage)
    serviceType: ServiceType[];
    serviceDate: Date;
    mileageAtService: number;          // Kilometer reading when the work was done
    costKes: number;                   // Total cost in KES
    garageName: string;                // e.g. "AutoXpress Ngong Rd", "Fundi Juma - Ngara"
    mechanicPhone?: string;            // Helpful for owner's personal recall
    description?: string;              // Notes on what was fixed/inspected
    partsReplaced: IPartItem[];
    receiptUrl?: string;               // Cloudinary image/PDF of physical receipt or job card
    verificationTier: VerificationTier;
    isBackdated: boolean;              // Automatically true if serviceDate > 30 days before log date
    createdAt: Date;
    updatedAt: Date;
}

// 5. Mongoose Schema
const serviceRecordSchema = new Schema<IServiceRecord>(
    {
        vehicle: {
            type: Schema.Types.ObjectId,
            ref: 'Vehicle',
            required: [true, 'Service record must be linked to a vehicle'],
            index: true,
        },
        loggedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Service record must record who logged it'],
        },
        serviceType: {
            type: [String],
            enum: {
                values: [
                    'OIL_CHANGE',
                    'MAJOR_SERVICE',
                    'BRAKES',
                    'SUSPENSION',
                    'TIRES',
                    'TRANSMISSION',
                    'BATTERY',
                    'ELECTRICAL',
                    'BODY_PAINT',
                    'OTHER',
                ],
                message: '{VALUE} is not an authorized service category',
            },
            required: [true, 'Please specify the service category'],
        },
        serviceDate: {
            type: Date,
            required: [true, 'Please provide the date when the service was performed'],
            max: [new Date(), 'Service date cannot be in the future'],
        },
        mileageAtService: {
            type: Number,
            required: [true, 'Please provide the odometer reading at the time of service'],
            min: [0, 'Mileage cannot be negative'],
            index: true,
        },
        costKes: {
            type: Number,
            required: [true, 'Please provide the total cost in KES'],
            min: [0, 'Cost cannot be negative'],
        },
        garageName: {
            type: String,
            required: [true, 'Please provide the garage or fundi name'],
            trim: true,
        },
        mechanicPhone: {
            type: String,
            trim: true,
            set: formatKenyanPhone,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        partsReplaced: [
            {
                partName: { type: String, required: true, trim: true },
                brand: { type: String, trim: true },
                partNumber: { type: String, trim: true },
                costKes: { type: Number, min: 0 },
            },
        ],
        receiptUrl: {
            type: String,
            trim: true, // Cloudinary secure image URL
        },
        verificationTier: {
            type: String,
            enum: ['TIER_1_SELF', 'TIER_2_DOCUMENTED', 'TIER_3_PARTNER'],
            default: 'TIER_1_SELF',
        },
        isBackdated: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);
// Compound Index: Quickly sort a vehicle's service history from newest to oldest
serviceRecordSchema.index({ vehicle: 1, serviceDate: -1 });
// Pre-save hook: Auto-detect backdated entries & auto-assign verification tier
serviceRecordSchema.pre('save', async function () {
    // 1. Anti-Gaming Rule: If service date is older than 30 days from creation, flag as backdated
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const timeDifference = Date.now() - new Date(this.serviceDate).getTime();
    if (timeDifference > thirtyDaysInMs) {
        this.isBackdated = true;
    }
    // 2. Automatic Tier Assignment: If receiptUrl is attached and not partner verified, mark TIER_2
    if (this.receiptUrl && this.verificationTier === 'TIER_1_SELF') {
        this.verificationTier = 'TIER_2_DOCUMENTED';
    }
});
// 6. Model Export
export const ServiceRecord: Model<IServiceRecord> = mongoose.model<IServiceRecord>(
    'ServiceRecord',
    serviceRecordSchema
);
export default ServiceRecord;