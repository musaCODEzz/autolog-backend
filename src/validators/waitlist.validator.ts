import { z } from 'zod';
import { formatKenyanPhone, isValidKenyanPhone } from '../utils/phone';

/**
 * Validation schema for Early Access Waitlist submission
 */
export const joinWaitlistSchema = z.object({
  fullName: z
    .string({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Full name must be text' }
          : { message: 'Please provide your full name' },
    })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),

  email: z
    .string({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Email must be text' }
          : { message: 'Please provide an email address' },
    })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),

  phone: z
    .string({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Phone must be text' }
          : { message: 'Please provide your phone number' },
    })
    .trim()
    .refine((val) => isValidKenyanPhone(val), {
      message: 'Please provide a valid Kenyan mobile number (e.g. 0712345678 or +254712345678)',
    })
    .transform((val) => formatKenyanPhone(val)),

  role: z
    .enum(['CAR_OWNER', 'GARAGE', 'PARTS_DEALER', 'BUYER'])
    .default('CAR_OWNER'),

  vehicleInterest: z
    .string()
    .max(120, 'Vehicle interest cannot exceed 120 characters')
    .trim()
    .optional(),

  // Checklist Item #23: Phone Consent Box (Mandatory Opt-in)
  phoneConsent: z
    .boolean({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Consent must be a boolean' }
          : { message: 'Please indicate phone consent' },
    })
    .refine((val) => val === true, {
      message: 'You must provide phone consent to receive early access updates via SMS/WhatsApp',
    }),

  // Checklist Item #30: UTM Tracking Parameters from query strings
  utmSource: z.string().trim().optional(),
  utmMedium: z.string().trim().optional(),
  utmCampaign: z.string().trim().optional(),
  utmContent: z.string().trim().optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
