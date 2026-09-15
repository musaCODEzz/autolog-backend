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
 *                 example: Musa Kibet
 *               email:
 *                 type: string
 *                 example: musa@autolog.co.ke
 *               phone:
 *                 type: string
 *                 example: "0712345678"
 *                 description: Any valid Kenyan format (07..., 01..., +254...)
 *               password:
 *                 type: string
 *                 example: Secret123
 *               role:
 *                 type: string
 *                 enum: [owner, dealer, garage]
 *                 default: owner
 *               businessDetails:
 *                 type: object
 *                 properties:
 *                   businessName:
 *                     type: string
 *                     example: Nairobi Motor Garage
 *                   location:
 *                     type: string
 *                     example: Industrial Area, Nairobi
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
