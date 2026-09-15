import { Request, Response, NextFunction } from "express";
import { verifyToken, IJwtPayload } from "../utils/jwt";
import { User, IUser, UserRole } from "../models/User";

/**
 * Extended Express Request inteface that includes the authenticated user
 * 
 */

export interface AuthRequest extends Request {
    user?: IUser;

}
/**
 * Middleware : Protects private routes by requiring a valid JWT Bearer token
 */

export const protect = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let token: string | undefined;
        // 1. check the Bearer token in the Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        // 2. if no token found block access
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Authentication required. Please provide a valid Bearer token'
            });
            return;
        }
        // 3 verify token signature and expiration
        const decoded: IJwtPayload | null = verifyToken(token);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token. Please log in again'
            });
            return;
        }
        // 4 verify user still exists in the db
        const user = await User.findById(decoded.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User no longer exists. Please log in again'
            });
            return;
        }
        // 5 check if user is suspended
        if (user.isSuspended) {
            res.status(403).json({
                success: false,
                message: `Your account has been suspended. Reason: ${user.suspensionReason || 'Violation of platform terms.'}`
            });
            return;
        }
        // 6. Attach authenticated user to req object
        req.user = user;

        // 7. Move to the controller
        next();

    } catch (error) {
        next(error);
    }
};
/**
 * Middleware: Enforces Role Based Access Control (RBAC)
 * @params roles - Array of allowed roles
 */

export const authorize = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        // 1. Ensure user is authenticated first
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required before authorization check.',
            });
            return;
        }
        // 2. Check if user's role is included in permitted roles
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
            });
            return;
        }
        // 3. Authorized! Proceed
        next();
    };
};
