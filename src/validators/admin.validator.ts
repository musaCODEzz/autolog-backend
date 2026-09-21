import { z } from 'zod';

/**
 * Schema: Verify or Revoke Garage Partner Accreditation (Tier 3)
 */
export const verifyGarageSchema = z.object({
  isVerifiedPartner: z.boolean({
    error: (issue) =>
      issue.code === 'invalid_type'
        ? { message: 'isVerifiedPartner must be true or false' }
        : { message: 'isVerifiedPartner is required' },
  }),
});

export type VerifyGarageInput = z.infer<typeof verifyGarageSchema>;

/**
 * Schema: Suspend or Unsuspend a User Account
 */
export const suspendUserSchema = z.object({
  isSuspended: z.boolean({
    error: (issue) =>
      issue.code === 'invalid_type'
        ? { message: 'isSuspended must be true or false' }
        : { message: 'isSuspended is required' },
  }),
  reason: z
    .string()
    .trim()
    .min(5, 'Suspension reason must be at least 5 characters (e.g. Counterfeit parts reported)')
    .max(500, 'Reason cannot exceed 500 characters')
    .optional(),
});

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
