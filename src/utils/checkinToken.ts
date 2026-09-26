import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * Payload interface embedded inside the time-limited check-in token
 */
export interface ICheckinTokenPayload {
  vehicleId: string;
  action: 'checkin';
}

/**
 * Generates a signed, single-purpose check-in token valid for 72 hours
 * @param vehicleId - MongoDB ObjectId string of the vehicle
 * @returns Cryptographically signed JWT string
 */
export const generateCheckinToken = (vehicleId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in ENV variables');
  }

  const payload: ICheckinTokenPayload = {
    vehicleId,
    action: 'checkin',
  };

  const options: SignOptions = {
    expiresIn: '72h',
  };

  return jwt.sign(payload, secret, options);
};

/**
 * Verifies and decodes an incoming check-in token
 * @param token - Raw JWT string from query param or URL path
 * @returns Validated check-in payload
 * @throws Error if token is expired, forged, or has wrong action scope
 */
export const verifyCheckinToken = (token: string): ICheckinTokenPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in ENV variables');
  }

  const decoded = jwt.verify(token, secret) as ICheckinTokenPayload;

  // Security guard: Ensure this token cannot be swapped for an auth login token
  if (decoded.action !== 'checkin' || !decoded.vehicleId) {
    throw new Error('Invalid check-in token payload');
  }

  return decoded;
};

export default {
  generateCheckinToken,
  verifyCheckinToken,
};
