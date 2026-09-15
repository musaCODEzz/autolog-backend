import { z } from 'zod';
import { isValidKenyanPhone } from '../utils/phone';

/**
 * Publicly registerable roles
 * 
*/

export const registerRoleEnum = z.enum(['owner', 'dealer', 'garage'],
    {
        error: () => ({
            message: "Role must be either 'owner', 'dealer', or 'garage'",
        }),
    }
);

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
    name: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Name is required and must be text' }
                    : { message: 'Please provide your full name' },
        })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters'),
    email: z.email({
        error: (issue) =>
            issue.code === 'invalid_type'
                ? { message: 'Email is required and must be text' }
                : { message: 'Please provide a valid email address' },
    }),
    phone: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Phone number is required' }
                    : { message: 'Please provide your phone number' },
        })
        .trim()
        .refine((val) => isValidKenyanPhone(val), {
            message:
                'Please provide a valid Kenyan phone number (e.g. 0712345678, 0112345678, or +254712345678)',
        }),
    password: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Password is required' }
                    : { message: 'Please provide a password' },
        })
        .min(8, 'Password must be at least 8 characters long')
        .regex(
            /^(?=.*[A-Za-z])(?=.*\d)/,
            'Password must contain at least one letter and one number'
        ),
    role: registerRoleEnum.default('owner'),
    // Optional business details for dealers or garages
    businessDetails: z
        .object({
            businessName: z.string().trim().min(2).optional(),
            location: z.string().trim().min(2).optional(),
        })
        .optional(),
});
/**
 * Login validation schema
 * Supports both email OR Kenyan phone number
 */
export const loginSchema = z.object({
    identifier: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Identifier is required' }
                    : { message: 'Please provide your email or phone number' },
        })
        .trim()
        .min(1, 'Please provide your email or phone number'),
    password: z
        .string({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? { message: 'Password is required' }
                    : { message: 'Please provide your password' },
        })
        .min(1, 'Password cannot be empty'),
});
// TypeScript type inference (automatically gives us compile-time TS types!)
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;