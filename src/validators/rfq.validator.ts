import { z } from 'zod';

/**
 * Spare Part Category Enum
 */
export const partCategoryEnum = z.enum([
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
], {
  error: () => ({ message: 'Invalid spare part category' }),
});

/**
 * Part Condition Preference Enum (Requester)
 */
export const partConditionPreferenceEnum = z.enum([
  'GENUINE_NEW',
  'OEM_MATCH',
  'AFTERMARKET',
  'USED_TESTED',
  'ANY',
], {
  error: () => ({ message: 'Invalid condition preference' }),
});

/**
 * Quote Part Condition Enum (Dealer Offer)
 */
export const quotePartConditionEnum = z.enum([
  'GENUINE_NEW',
  'OEM_MATCH',
  'AFTERMARKET',
  'USED_TESTED',
], {
  error: () => ({ message: 'Condition must be GENUINE_NEW, OEM_MATCH, AFTERMARKET, or USED_TESTED' }),
});

/**
 * Part Urgency Enum
 */
export const partUrgencyEnum = z.enum([
  'CRITICAL_BREAKDOWN',
  'WITHIN_WEEK',
  'FLEXIBLE',
], {
  error: () => ({ message: 'Urgency must be CRITICAL_BREAKDOWN, WITHIN_WEEK, or FLEXIBLE' }),
});

/**
 * Fulfillment Type Enum (Kenyan Logistics)
 */
export const fulfillmentTypeEnum = z.enum([
  'PICKUP',            // Kirinyaga Rd / Grogan shop counter
  'DELIVERY_NAIROBI',   // Boda/Rider delivery within Nairobi
  'UPCOUNTRY_PARCEL',   // Matatu/Courier (2NK, Easy Coach, Fargo, Wells Fargo)
  'FLEXIBLE',
], {
  error: () => ({ message: 'Invalid fulfillment type' }),
});

/**
 * Part Availability Enum
 */
export const partAvailabilityEnum = z.enum([
  'IN_STOCK_COLLECT',
  'SAME_DAY_DELIVERY',
  '1_TO_3_DAYS',
], {
  error: () => ({ message: 'Availability must be IN_STOCK_COLLECT, SAME_DAY_DELIVERY, or 1_TO_3_DAYS' }),
});

/**
 * Schema: Create a new Spare Parts RFQ (PartRequest)
 */
export const createPartRequestSchema = z.object({
  vehicleId: z
    .string({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Vehicle ID must be text' }
          : { message: 'Vehicle ID is required' },
    })
    .trim()
    .min(1, 'Vehicle ID is required to extract fitment specs'),
  partName: z
    .string({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Part name must be text' }
          : { message: 'Part name is required' },
    })
    .trim()
    .min(2, 'Part name must be at least 2 characters (e.g. Front Shock Absorbers, Alternator)')
    .max(150, 'Part name cannot exceed 150 characters'),
  category: partCategoryEnum,
  quantity: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Quantity must be a number' }
          : { message: 'Please specify the quantity needed' },
    })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .default(1),
  oemPartNumber: z
    .string()
    .trim()
    .max(50, 'OEM Part Number cannot exceed 50 characters')
    .optional(),
  preference: partConditionPreferenceEnum.default('ANY'),
  urgency: partUrgencyEnum.default('WITHIN_WEEK'),
  fulfillmentType: fulfillmentTypeEnum.default('FLEXIBLE'),
  deliveryLocation: z
    .string()
    .trim()
    .max(150, 'Delivery location cannot exceed 150 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  photos: z.array(z.url({ message: 'Each photo must be a valid URL' })).default([]),
});

export type CreatePartRequestInput = z.infer<typeof createPartRequestSchema>;

/**
 * Schema: Dealer Submits a Quote with 48-Hour Price Lock
 */
export const createPartQuoteSchema = z.object({
  partRequestId: z
    .string({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Part Request ID must be text' }
          : { message: 'Part Request ID is required' },
    })
    .trim()
    .min(1, 'Part Request ID is required'),
  brandOffered: z
    .string({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Brand name must be text' }
          : { message: 'Please specify the brand offered (e.g. Denso, KYB, 555, OEM Toyota)' },
    })
    .trim()
    .min(2, 'Brand name must be at least 2 characters')
    .max(100, 'Brand name cannot exceed 100 characters'),
  condition: quotePartConditionEnum,
  priceKes: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Price must be a number' }
          : { message: 'Total price in KES is required' },
    })
    .min(1, 'Price in KES must be greater than zero'),
  warrantyDays: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Warranty days must be a number' }
          : { message: 'Warranty days is required (enter 0 if sold as-is)' },
    })
    .int('Warranty days must be an integer')
    .min(0, 'Warranty days cannot be negative')
    .default(0),
  availability: partAvailabilityEnum.default('IN_STOCK_COLLECT'),
  partPhotoUrl: z.url({ message: 'Part photo URL must be a valid URL' }).optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional(),
});

export type CreatePartQuoteInput = z.infer<typeof createPartQuoteSchema>;
