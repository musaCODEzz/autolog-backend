import { Router } from 'express';
import {
  createServiceRecord,
  getVehicleServiceHistory,
  getServiceRecordById,
} from '../controllers/service.controller';
import { protect } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createServiceRecordSchema } from '../validators/service.validator';

const router = Router();

// All service record routes require authentication
router.use(protect);

/**
 * @openapi
 * /api/v1/services:
 *   post:
 *     summary: Log a new vehicle service record
 *     description: Stamped by vehicle owner or verified partner garage. Tier 1 (Self) if no receipt, Tier 2 (Documented) if receipt attached, Tier 3 (Partner) if stamped by verified partner garage.
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - serviceType
 *               - serviceDate
 *               - mileageAtService
 *               - costKes
 *               - garageName
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 example: "6aac4508bacb9ba29db43975"
 *               serviceType:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [OIL_CHANGE, MAJOR_SERVICE, BRAKES, SUSPENSION, TIRES, TRANSMISSION, BATTERY, ELECTRICAL, BODY_PAINT, OTHER]
 *                 example: ["OIL_CHANGE", "BRAKES"]
 *               serviceDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-09-15"
 *                 description: Date service was performed (cannot be future date)
 *               mileageAtService:
 *                 type: number
 *                 example: 78500
 *               costKes:
 *                 type: number
 *                 example: 8500
 *               garageName:
 *                 type: string
 *                 example: "AutoXpress Ngong Road"
 *               mechanicPhone:
 *                 type: string
 *                 example: "0712345678"
 *               description:
 *                 type: string
 *                 example: "Replaced engine oil with 5W-30 synthetic and installed new front ceramic brake pads"
 *               partsReplaced:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     partName:
 *                       type: string
 *                       example: "Front Brake Pads"
 *                     brand:
 *                       type: string
 *                       example: "Brembo"
 *                     partNumber:
 *                       type: string
 *                       example: "P83082N"
 *                     costKes:
 *                       type: number
 *                       example: 4500
 *               receiptUrl:
 *                 type: string
 *                 example: "https://res.cloudinary.com/demo/image/upload/job_card_001.jpg"
 *     responses:
 *       201:
 *         description: Service record logged successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not vehicle owner or authorized garage)
 *       404:
 *         description: Vehicle not found
 */
router.post('/', validate(createServiceRecordSchema), createServiceRecord);

/**
 * @openapi
 * /api/v1/services/vehicle/{vehicleId}:
 *   get:
 *     summary: Get complete service history for a vehicle
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Vehicle service history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 */
router.get('/vehicle/:vehicleId', getVehicleServiceHistory);

/**
 * @openapi
 * /api/v1/services/{id}:
 *   get:
 *     summary: Get single service record details
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service record MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Service record retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service record not found
 */
router.get('/:id', getServiceRecordById);

export default router;
