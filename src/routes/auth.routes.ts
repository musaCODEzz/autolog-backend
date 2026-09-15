import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { protect } from '../middlewares/auth.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user account (Owner, Dealer, or Garage)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *                 description: Any valid Kenyan format (07..., 01..., +254...)
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [owner, dealer, garage]
 *                 default: owner
 *               businessDetails:
 *                 type: object
 *                 description: Mandatory for 'dealer' or 'garage'. Must be omitted for 'owner'.
 *                 properties:
 *                   businessName:
 *                     type: string
 *                   location:
 *                     type: string
 *           examples:
 *             CarOwner:
 *               summary: Car Owner (Private Individual)
 *               value:
 *                 name: Musa Kibet
 *                 email: musa@autolog.co.ke
 *                 phone: "0712345678"
 *                 password: SecretPassword123
 *                 role: owner
 *             Garage:
 *               summary: Garage / Mechanic Workshop (Commercial)
 *               value:
 *                 name: Kamau Mechanic
 *                 email: kamau@garage.co.ke
 *                 phone: "0722112233"
 *                 password: SecretPassword123
 *                 role: garage
 *                 businessDetails:
 *                   businessName: Nairobi Motor Care
 *                   location: Industrial Area, Nairobi
 *             Dealer:
 *               summary: Spare Parts Dealer (Commercial)
 *               value:
 *                 name: Hassan Spares
 *                 email: hassan@parts.co.ke
 *                 phone: "0733445566"
 *                 password: SecretPassword123
 *                 role: dealer
 *                 businessDetails:
 *                   businessName: Kirinyaga Auto Spares
 *                   location: Kirinyaga Road, Nairobi
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or phone number already registered
 */
router.post('/register', validate(registerSchema), register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in with Email OR Kenyan Phone Number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: "0712345678"
 *                 description: Email address OR Kenyan phone number
 *               password:
 *                 type: string
 *                 example: Secret123
 *     responses:
 *       200:
 *         description: Login successful with JWT token
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account suspended
 */
router.post('/login', validate(loginSchema), login);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized (Token missing or invalid)
 *       403:
 *         description: Account suspended
 */
router.get('/me', protect, getMe);

export default router;
