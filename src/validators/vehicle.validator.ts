import { z } from 'zod';
import { isValidKenyanPlate } from '../utils/plate';

/**
 * Enums matching the vehicle model
 */

export const transmissionEnum = z.enum(['AUTOMATIC', 'MANUAL'], {
    error: () => ({ message: "Transmission must be either 'AUTOMATIC' or 'MANUAL'" }),
});

export const fuelTypeEnum = z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID'], {
    error: () => ({ message: "Fuel type must be 'PETROL', 'DIESEL', 'ELECTRIC', or 'HYBRID'" }),
});

export const mileageUnitEnum = z.enum(['KM', 'MILES'], {
    error: () => ({ message: "Mileage unit must be 'KM' or 'MILES'" }),
});

export const vehicleStatusEnum = z.enum(['active', 'sold', 'archived'], {
    error: () => ({ message: "Vehicle status must be 'active', 'sold', or 'archived'" }),
});

/**
 * Schema for creating a new vehicle  
 */

export const createVehicleSchema = z
    .object({
        plateNumber: z
            .string({
                error: (issue) =>
                    issue.code === 'invalid_type'
                        ? { message: 'Plate number is required' }
                        : { message: 'Please provide a valid plate number' },
            })
            .trim()
            .refine((val) => isValidKenyanPlate(val), {
                message: 'Invalid Kenyan number plate format. Expected format: KDA 123A (e.g. KCA 001B)',
            }),
        make: z
            .string({
                error: (issue) =>
                    issue.code === 'invalid_type'
                        ? { message: 'Make is required' }
                        : { message: 'Please provide the vehicle make' },
            })
            .trim()
            .min(2, 'Make must be at least 2 characters (e.g. Toyota, Mazda, Subaru)'),
        model: z
            .string({
                error: (issue) =>
                    issue.code === 'invalid_type'
                        ? { message: 'Model is required' }
                        : { message: 'Please provide the vehicle model' },
            })
            .trim()
            .min(1, 'Model is required (e.g. Fielder, CX-5, Forester)'),
        year: z
            .number({
                error: (issue) =>
                    issue.code === 'invalid_type'
                        ? { message: 'Year of manufacture must be a number' }
                        : { message: 'Please provide the year of manufacture' },
            })
            .int('Year must be a whole number')
            .min(1970, 'Year must be 1970 or newer')
            .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
        engine: z.string().trim().optional(),
        transmission: transmissionEnum.default('AUTOMATIC'),
        fuelType: fuelTypeEnum.default('PETROL'),
        chassisNumber: z
            .string()
            .trim()
            .toUpperCase()
            .min(6, 'Chassis/VIN number should be at least 6 characters')
            .max(25, 'Chassis/VIN number cannot exceed 25 characters')
            .optional(),
        mileageUnit: mileageUnitEnum.default('KM'),
        initialMileage: z
            .number({
                error: (issue) =>
                    issue.code === 'invalid_type'
                        ? { message: 'Initial mileage must be a number' }
                        : { message: 'Please provide initial mileage' },
            })
            .min(0, 'Mileage cannot be negative'),
        currentMileage: z
            .number({
                error: (issue) =>
                    issue.code === 'invalid_type'
                        ? { message: 'Current mileage must be a number' }
                        : { message: 'Please provide current mileage' },
            })
            .min(0, 'Mileage cannot be negative'),
        estDailyKm: z
            .number()
            .min(1, 'Estimated daily km must be at least 1')
            .max(1000, 'Estimated daily km cannot exceed 1000')
            .default(35),
        photos: z.array(z.url({ message: 'Photo must be a valid URL' })).default([]),
    })
    .refine((data) => data.currentMileage >= data.initialMileage, {
        message: 'Current mileage cannot be lower than initial mileage',
        path: ['currentMileage'],
    });
/**
 * Schema: Update Odometer Reading
 */
export const updateMileageSchema = z.object({
    currentMileage: z
        .number({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Mileage must be a number' }
                    : { message: 'Please provide the new mileage reading' },
        })
        .min(0, 'Mileage cannot be negative'),
});

/**
 * Schema: Update General Vehicle Profile
 */
export const updateVehicleSchema = z.object({
    make: z.string().trim().min(2).optional(),
    model: z.string().trim().min(1).optional(),
    year: z.number().int().min(1970).max(new Date().getFullYear() + 1).optional(),
    engine: z.string().trim().optional(),
    transmission: transmissionEnum.optional(),
    fuelType: fuelTypeEnum.optional(),
    chassisNumber: z.string().trim().toUpperCase().min(6).max(25).optional(),
    estDailyKm: z.number().min(1).max(1000).optional(),
    status: vehicleStatusEnum.optional(),
    photos: z.array(z.url({ message: 'Photo must be a valid URL' })).optional(),
});
// TypeScript type inference
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateMileageInput = z.infer<typeof updateMileageSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
