import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../models/User";

export interface IJwtPayload {
    userId: string;
    role: UserRole;
}

// generate a signed JWT Token
export const generateToken = (payload: IJwtPayload): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in ENV variables');
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions['expiresIn']

    const options: SignOptions = {
        expiresIn,
    };

    return jwt.sign(payload, secret, options);
};

// verify and decode an incoming JWT Token
export const verifyToken = (token: string): IJwtPayload => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in ENV variables');
    }

    // verifies signatures & expiration
    const decoded = jwt.verify(token, secret) as IJwtPayload;
    return decoded;

};

export default {
    generateToken,
    verifyToken,
}