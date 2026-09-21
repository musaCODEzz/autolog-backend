import { Router } from 'express';
import {
  verifyGaragePartner,
  toggleUserSuspension,
  getPlatformStats,
  listUsersForAdmin,
} from '../controllers/admin.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  verifyGarageSchema,
  suspendUserSchema,
} from '../validators/admin.validator';

const router = Router();

// 🛡️ UNCOMPROMISING SECURITY GATE: All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

/**
 * @openapi
 * /api/v1/admin/stats:
 *   get:
 *     summary: Platform health & ecosystem statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.get('/stats', getPlatformStats);

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     summary: List and search users (Owners, Garages, Dealers)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [owner, garage, dealer, admin]
 *       - in: query
 *         name: isVerifiedPartner
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isSuspended
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User list retrieved successfully
 */
router.get('/users', listUsersForAdmin);

/**
 * @openapi
 * /api/v1/admin/garages/{id}/verify:
 *   patch:
 *     summary: Verify or revoke garage accreditation (Tier 3 Partner status)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isVerifiedPartner
 *             properties:
 *               isVerifiedPartner:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Garage partner accreditation updated
 *       400:
 *         description: Target user is not a garage
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.patch(
  '/garages/:id/verify',
  validate(verifyGarageSchema),
  verifyGaragePartner
);

/**
 * @openapi
 * /api/v1/admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspend or reactivate user account (Instant session revocation)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isSuspended
 *             properties:
 *               isSuspended:
 *                 type: boolean
 *                 example: true
 *               reason:
 *                 type: string
 *                 example: "Suspicious odometer rollback logs detected"
 *     responses:
 *       200:
 *         description: User suspension status updated
 *       400:
 *         description: Admin cannot suspend themselves
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.patch(
  '/users/:id/suspend',
  validate(suspendUserSchema),
  toggleUserSuspension
);

export default router;
