import { z } from 'zod';
import { isValidKenyanPhone } from '../utils/phone';

/**
 * Service category enum
 */

export const serviceTypeEnum = z.enum([
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
], {
    error: () => ({ message: 'Invalid Service category specified' }),
});

/**
 * Individual Part Schema
 */

export const partItemSchema = z.object({
    partName: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Part name must be text' }
                    : { message: 'Part name is required' },
        })
        .trim()
        .min(2, 'Part name must be at least 2 characters (e.g. Oil Filter, Brake Pads)'),
    brand: z.string().trim().optional(),
    partNumber: z.string().trim().optional(),
    costKes: z.number().min(0, 'Part cost cannot be negative').optional(),
});

/**
 * Schema create a new service record
 */
export const createServiceRecordSchema = z.object({
    vehicleId: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Vehicle ID must be text' }
                    : { message: 'Vehicle ID is required' },
        })
        .trim()
        .min(1, 'Vehicle ID is required'),
    serviceType: z
        .array(serviceTypeEnum)
        .min(1, 'Please select at least one service category (e.g. OIL_CHANGE, BRAKES)'),
    serviceDate: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Service date must be a date string' }
                    : { message: 'Service date is required' },
        })
        .refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format (expected ISO date e.g. 2026-09-18)',
        })
        .refine((val) => new Date(val) <= new Date(), {
            message: 'Service date cannot be in the future',
        }),
    mileageAtService: z
        .number({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Mileage at service must be a number' }
                    : { message: 'Please provide the odometer reading at service' },
        })
        .min(0, 'Mileage cannot be negative'),
    costKes: z
        .number({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Cost must be a number' }
                    : { message: 'Please provide the total service cost in KES' },
        })
        .min(0, 'Cost cannot be negative'),
    garageName: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Garage name must be text' }
                    : { message: 'Garage or mechanic name is required' },
        })
        .trim()
        .min(2, 'Garage or mechanic name must be at least 2 characters (e.g. AutoXpress, Fundi Juma - Ngara)'),
    mechanicPhone: z
        .string()
        .trim()
        .refine((val) => !val || isValidKenyanPhone(val), {
            message: 'Invalid Kenyan phone number for mechanic (e.g. 0712345678, +254...)',
        })
        .optional(),
    description: z
        .string()
        .trim()
        .max(1000, 'Description cannot exceed 1000 characters')
        .optional(),
    partsReplaced: z.array(partItemSchema).default([]),
    // Cloudinary receipt image or job card URL
    receiptUrl: z.url({ message: 'Receipt URL must be a valid URL' }).optional(),
});

export type CreateServiceRecordInput = z.infer<typeof createServiceRecordSchema>;