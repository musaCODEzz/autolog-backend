import { Router } from 'express';
import { joinWaitlist, getWaitlistCount } from '../controllers/waitlist.controller';
import { validate } from '../middlewares/validate.middleware';
import { joinWaitlistSchema } from '../validators/waitlist.validator';

const router = Router();

/**
 * @openapi
 * /api/v1/waitlist:
 *   post:
 *     summary: Join the AutoLog Kenya early access / beta tester waitlist
 *     description: Captures early tester lead with mandatory phone consent (Item #23) and UTM campaign attribution tracking (Item #30).
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - phoneConsent
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Brian Kamau"
 *               email:
 *                 type: string
 *                 example: "brian@autolog.ke"
 *               phone:
 *                 type: string
 *                 example: "0712345678"
 *                 description: Valid Kenyan mobile number normalized to +254...
 *               role:
 *                 type: string
 *                 enum: [CAR_OWNER, GARAGE, PARTS_DEALER, BUYER]
 *                 default: CAR_OWNER
 *               vehicleInterest:
 *                 type: string
 *                 example: "Mazda Demio 2016"
 *               phoneConsent:
 *                 type: boolean
 *                 example: true
 *                 description: Explicit consent to receive early access updates via SMS/WhatsApp
 *               utmSource:
 *                 type: string
 *                 example: "twitter"
 *               utmMedium:
 *                 type: string
 *                 example: "social"
 *               utmCampaign:
 *                 type: string
 *                 example: "beta_launch_2026"
 *     responses:
 *       201:
 *         description: Successfully registered for early access
 *       400:
 *         description: Validation error or missing phone consent
 *       409:
 *         description: Email already registered on waitlist
 */
router.post('/', validate(joinWaitlistSchema), joinWaitlist);

/**
 * @openapi
 * /api/v1/waitlist/count:
 *   get:
 *     summary: Get public waitlist count for social proof
 *     tags: [Waitlist]
 *     responses:
 *       200:
 *         description: Public count returned successfully
 */
router.get('/count', getWaitlistCount);

export default router;
