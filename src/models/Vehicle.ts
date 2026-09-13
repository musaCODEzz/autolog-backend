import mongoose, { Schema, Model, Types } from 'mongoose';
import { normalizeKenyanPlate } from '../utils/plate';

export type TransmissionType = 'AUTOMATIC' | 'MANUAL';
export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
export type VehicleStatus = 'active' | 'sold' | 'archived';
export type MileageUnit = 'KM' | 'MILES';

export interface IVehicle {
  owner: Types.ObjectId;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  transmission: TransmissionType;
  fuelType: FuelType;
  chassisNumber?: string;
  mileageUnit: MileageUnit;
  initialMileage: number;
  currentMileage: number;
  estDailyKm: number;
  lastMileageUpdate: Date;
  passportSlug: string;
  status: VehicleStatus;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vehicle must belong to a registered user'],
      index: true,
    },
    plateNumber: {
      type: String,
      required: [true, 'Please provide the vehicle number plate'],
      unique: true,
      trim: true,
      set: normalizeKenyanPlate,
      match: [
        /^K[A-Z]{2}\s\d{3}[A-Z]$/,
        'Please provide a valid Kenyan number plate (e.g. KDA 123A, KCA 001B)',
      ],
      index: true,
    },
    make: {
      type: String,
      required: [true, 'Please provide the vehicle make (e.g. Toyota, Subaru, Mazda)'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Please provide the vehicle model (e.g. Fielder, CX-5, Forester)'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Please provide the year of manufacture'],
      min: [1970, 'Year must be 1970 or newer'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
    },
    engine: {
      type: String,
      trim: true,
    },
    transmission: {
      type: String,
      enum: {
        values: ['AUTOMATIC', 'MANUAL'],
        message: '{VALUE} must be either AUTOMATIC or MANUAL',
      },
      default: 'AUTOMATIC',
    },
    fuelType: {
      type: String,
      enum: {
        values: ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID'],
        message: '{VALUE} is not a supported fuel type',
      },
      default: 'PETROL',
    },
    chassisNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    mileageUnit: {
      type: String,
      enum: {
        values: ['KM', 'MILES'],
        message: '{VALUE} is not a supported mileage unit',
      },
      default: 'KM',
    },
    initialMileage: {
      type: Number,
      required: [true, 'Please provide the initial odometer reading (km)'],
      min: [0, 'Mileage cannot be negative'],
    },
    currentMileage: {
      type: Number,
      required: [true, 'Please provide the current odometer reading (km)'],
      min: [0, 'Mileage cannot be negative'],
    },
    estDailyKm: {
      type: Number,
      default: 35,
      min: [1, 'Daily km must be at least 1'],
      max: [1000, 'Daily km cannot exceed 1000'],
    },
    lastMileageUpdate: {
      type: Date,
      default: Date.now,
    },
    passportSlug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'archived'],
      default: 'active',
    },
    photos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Auto-generate privacy-safe passportSlug (e.g. "mazda-cx5-7f9a2b")
vehicleSchema.pre('save', async function () {
  if (this.passportSlug) {
    return;
  }
  // Uses make & model with random hash (Zero plate leakage in the URL!)
  const cleanMake = this.make.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanModel = this.model.toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8); // 6-character random token
  this.passportSlug = `${cleanMake}-${cleanModel}-${randomSuffix}`;
});
// 4. Model Export
export const Vehicle: Model<IVehicle> = mongoose.model<IVehicle>('Vehicle', vehicleSchema);
export default Vehicle;