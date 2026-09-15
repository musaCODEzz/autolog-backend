import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { generateToken } from "../utils/jwt";
import { formatKenyanPhone } from "../utils/phone";
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * @desc Register a new user (Owner, Dealer, or Garage)
 * @route POST /api/v1/auth/register
 * @access Public
 */

export const register = async (
    req: Request<{}, {}, RegisterInput>,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { name, email, phone, password, role, businessDetails } = req.body;
        // 1. Format phone number
        const formattedPhone = formatKenyanPhone(phone);

        // 2 check for existing user (by phone or email)
        const existingUser = await User.findOne({
            $or: [{ phone: formattedPhone }, { email: email.toLowerCase() }]
        });

        if (existingUser) {
            const isEmailConflict = existingUser.email === email.toLowerCase();
            res.status(409).json({
                success: false,
                message: isEmailConflict
                    ? 'Email already registered with another account'
                    : 'Phone number already registered with another account',
            });
            return;
        }
        const isBusiness = role === 'dealer' || role === 'garage';

        // 3. Create new user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            phone: formattedPhone,
            password,
            role: role || 'owner',
            businessDetails: isBusiness && businessDetails
                ? {
                    businessName: businessDetails.businessName,
                    location: businessDetails.location,
                    isVerifiedPartner: false,
                    rating: 5.0,
                    totalReviews: 0,
                }
                : undefined,
        });
        // 4. Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            role: user.role,
        });

        // 5 send success response 
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user,
                token,
            },
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Authenticate user & get token (Login with Email OR Kenyan Phone)
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { identifier, password } = req.body;
        // 1. Determine whether identifier is an Email or Kenyan Phone Number
        const isEmail = identifier.includes('@');
        const query = isEmail
            ? { email: identifier.toLowerCase().trim() }
            : { phone: formatKenyanPhone(identifier) };
        // 2. Find user in database and explicitly select password (select: false by default)
        const user = await User.findOne(query).select('+password');
        // 3. Anti-Enumeration Defense: Generic error if user not found
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }
        // 4. Check if password matches using bcrypt method on User instance
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }
        // 5. Anti-Fraud Check: Check if account has been suspended
        if (user.isSuspended) {
            res.status(403).json({
                success: false,
                message: `Your account has been suspended. Reason: ${user.suspensionReason || 'Contact support'}`,
            });
            return;
        }
        // 6. Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            role: user.role,
        });
        // 7. Remove password from response object
        user.password = undefined;
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token,
            },
        });
    } catch (error) {
        next(error);
    }
};
/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/v1/auth/me
 * @access  Private (Requires protect middleware)
 */
export const getMe = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // req.user was already verified and attached by the protect middleware!
        res.status(200).json({
            success: true,
            data: {
                user: req.user,
            },
        });
    } catch (error) {
        next(error);
    }
};

