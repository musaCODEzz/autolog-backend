import { z } from 'zod';

/**
 * Validation schema for submitting an odometer check-in
 */
export const submitCheckinSchema = z.object({
  newMileage: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type'
          ? { message: 'Odometer reading must be a number' }
          : { message: 'Please provide the new odometer reading' },
    })
    .int('Odometer reading must be a whole number')
    .min(0, 'Odometer reading cannot be negative')
    .max(2000000, 'Odometer reading cannot exceed 2,000,000 km'),
});

/**
 * Inferred TypeScript input type
 */
export type SubmitCheckinInput = z.infer<typeof submitCheckinSchema>;
