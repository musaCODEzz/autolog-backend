import { Router } from 'express';
import {
  createVehicle,
  getMyVehicles,
  getVehicleById,
  updateMileage,
  updateVehicle,
  getPublicPassport,
} from '../controllers/vehicle.controller';
import { protect } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createVehicleSchema,
  updateMileageSchema,
  updateVehicleSchema,
} from '../validators/vehicle.validator';

const router = Router();

// ==========================================
// 🌐 PUBLIC ROUTES (No Token Needed)
// ==========================================

/**
 * @openapi
 * /api/v1/vehicles/passport/{slug}:
 *   get:
 *     summary: Public Digital Vehicle Passport (Sanitized, Masked & Trust-Scored)
 *     description: Allows prospective car buyers, insurers, and inspectors to verify vehicle history without an account. Plate and chassis are masked for privacy.
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique vehicle passport slug (e.g. mazda-cx5-7f9a2b)
 *         example: mazda-cx5-7f9a2b
 *     responses:
 *       200:
 *         description: Public vehicle passport retrieved successfully
 *       404:
 *         description: Vehicle passport not found or is private
 */
router.get('/passport/:slug', getPublicPassport);

// ==========================================
// 🔒 PROTECTED ROUTES (Require Bearer Token)
// ==========================================

/**
 * @openapi
 * /api/v1/vehicles:
 *   post:
 *     summary: Register a new vehicle to the digital passport
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plateNumber
 *               - make
 *               - model
 *               - year
 *               - initialMileage
 *               - currentMileage
 *             properties:
 *               plateNumber:
 *                 type: string
 *                 example: "KDA 123A"
 *                 description: Valid Kenyan NTSA plate (K + 2 letters + space + 3 digits + 1 letter)
 *               make:
 *                 type: string
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 example: "Fielder"
 *               year:
 *                 type: integer
 *                 example: 2018
 *               engine:
 *                 type: string
 *                 example: "1NZ-FE 1.5L"
 *               transmission:
 *                 type: string
 *                 enum: [AUTOMATIC, MANUAL]
 *                 default: AUTOMATIC
 *               fuelType:
 *                 type: string
 *                 enum: [PETROL, DIESEL, ELECTRIC, HYBRID]
 *                 default: PETROL
 *               chassisNumber:
 *                 type: string
 *                 example: "NZE161-1234567"
 *               mileageUnit:
 *                 type: string
 *                 enum: [KM, MILES]
 *                 default: KM
 *               initialMileage:
 *                 type: number
 *                 example: 72000
 *               currentMileage:
 *                 type: number
 *                 example: 72000
 *               estDailyKm:
 *                 type: number
 *                 example: 35
 *                 default: 35
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://res.cloudinary.com/demo/image/upload/car_front.jpg"]
 *     responses:
 *       201:
 *         description: Vehicle registered successfully
 *       400:
 *         description: Validation error or current mileage lower than initial mileage
 *       401:
 *         description: Unauthorized (Token missing or invalid)
 *       409:
 *         description: Vehicle with this plate number is already registered
 */
router.post('/', protect, validate(createVehicleSchema), createVehicle);

/**
 * @openapi
 * /api/v1/vehicles:
 *   get:
 *     summary: List all vehicles owned by the authenticated user
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's vehicles retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, getMyVehicles);

/**
 * @openapi
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: Get single vehicle by ID (Owner Isolation Guard)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Vehicle retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found or belongs to another user
 */
router.get('/:id', protect, getVehicleById);

/**
 * @openapi
 * /api/v1/vehicles/{id}/mileage:
 *   patch:
 *     summary: Update vehicle odometer reading (Anti-Rollback Guard)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentMileage
 *             properties:
 *               currentMileage:
 *                 type: number
 *                 example: 78500
 *     responses:
 *       200:
 *         description: Odometer reading updated successfully
 *       400:
 *         description: Rollback detected (new mileage is lower than current mileage)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 */
router.patch(
  '/:id/mileage',
  protect,
  validate(updateMileageSchema),
  updateMileage
);

/**
 * @openapi
 * /api/v1/vehicles/{id}:
 *   patch:
 *     summary: Update general vehicle profile details
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               engine:
 *                 type: string
 *               transmission:
 *                 type: string
 *                 enum: [AUTOMATIC, MANUAL]
 *               fuelType:
 *                 type: string
 *                 enum: [PETROL, DIESEL, ELECTRIC, HYBRID]
 *               chassisNumber:
 *                 type: string
 *               estDailyKm:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, sold, archived]
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Vehicle profile updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 */
router.patch(
  '/:id',
  protect,
  validate(updateVehicleSchema),
  updateVehicle
);

export default router;
