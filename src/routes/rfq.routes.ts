import { Router } from 'express';
import {
  createPartRequest,
  getMyPartRequests,
  getPartRequestById,
  getDealerFeed,
  cancelPartRequest,
  submitQuote,
  getMySubmittedQuotes,
  acceptQuote,
} from '../controllers/rfq.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createPartRequestSchema,
  createPartQuoteSchema,
} from '../validators/rfq.validator';

const router = Router();

// All RFQ and quote operations require authentication
router.use(protect);

/**
 * @openapi
 * /api/v1/rfq/requests:
 *   post:
 *     summary: Create a new spare parts RFQ
 *     description: Car owners and garages can broadcast requests for genuine, OEM, or aftermarket parts. Automatically extracts vehicle fitment specs.
 *     tags: [Spare Parts RFQ]
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
 *               - partName
 *               - category
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 example: "6aac4508bacb9ba29db43975"
 *               partName:
 *                 type: string
 *                 example: "Front Shock Absorbers"
 *               category:
 *                 type: string
 *                 enum: [ENGINE, SUSPENSION, BRAKES, TRANSMISSION, BODY, ELECTRICAL, FILTERS_SERVICE, COOLING, EXHAUST, OTHER]
 *                 example: "SUSPENSION"
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               oemPartNumber:
 *                 type: string
 *                 example: "48510-69415"
 *               preference:
 *                 type: string
 *                 enum: [GENUINE_NEW, OEM_MATCH, AFTERMARKET, USED_TESTED, ANY]
 *                 example: "OEM_MATCH"
 *               urgency:
 *                 type: string
 *                 enum: [CRITICAL_BREAKDOWN, WITHIN_WEEK, FLEXIBLE]
 *                 example: "WITHIN_WEEK"
 *               fulfillmentType:
 *                 type: string
 *                 enum: [PICKUP, DELIVERY_NAIROBI, UPCOUNTRY_PARCEL, FLEXIBLE]
 *                 example: "DELIVERY_NAIROBI"
 *               deliveryLocation:
 *                 type: string
 *                 example: "Westlands, Nairobi"
 *               description:
 *                 type: string
 *                 example: "Needs to fit 2019 Toyota Land Cruiser Prado J150 1GD-FTV"
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://res.cloudinary.com/autolog/parts/shocks_sample.jpg"]
 *     responses:
 *       201:
 *         description: RFQ created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/requests', validate(createPartRequestSchema), createPartRequest);

/**
 * @openapi
 * /api/v1/rfq/requests/my:
 *   get:
 *     summary: List all RFQs created by the logged-in user
 *     tags: [Spare Parts RFQ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user RFQs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/requests/my', getMyPartRequests);

/**
 * @openapi
 * /api/v1/rfq/feed:
 *   get:
 *     summary: Dealer Feed - Browse open RFQs needing quotes
 *     description: Exclusively accessible to registered parts dealers and platform admins. Displays complete fitment specs (engine code, chassis, year) to eliminate incorrect part delivery.
 *     tags: [Spare Parts RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by part category (e.g. SUSPENSION, BRAKES)
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *         description: Filter by urgency (CRITICAL_BREAKDOWN, WITHIN_WEEK)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (OPEN, QUOTED)
 *     responses:
 *       200:
 *         description: Dealer feed retrieved successfully
 *       403:
 *         description: Forbidden (Requires dealer or admin role)
 */
router.get('/feed', authorize('dealer', 'admin'), getDealerFeed);

/**
 * @openapi
 * /api/v1/rfq/requests/{id}:
 *   get:
 *     summary: Get RFQ details by ID
 *     description: Includes Anti-Cartel Blind-Bidding protection. Requesters see all competing bids sorted cheapest first. Dealers only see vehicle specs and their own submitted quote.
 *     tags: [Spare Parts RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Part Request MongoDB ObjectId
 *     responses:
 *       200:
 *         description: RFQ details retrieved successfully
 *       404:
 *         description: Part request not found
 */
router.get('/requests/:id', getPartRequestById);

/**
 * @openapi
 * /api/v1/rfq/requests/{id}/cancel:
 *   patch:
 *     summary: Cancel an open RFQ
 *     tags: [Spare Parts RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RFQ cancelled successfully
 *       400:
 *         description: Cannot cancel fulfilled or accepted RFQ
 *       403:
 *         description: Forbidden (Not the creator)
 */
router.patch('/requests/:id/cancel', cancelPartRequest);

/**
 * @openapi
 * /api/v1/rfq/quotes:
 *   post:
 *     summary: Submit quotation with 48-Hour Price Lock Guarantee
 *     description: Authorized parts dealers submit price, brand, and warranty. Price is contractually locked for 48 hours to eliminate the 'bei ilipanda asubuhi' bait-and-switch.
 *     tags: [Spare Parts RFQ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partRequestId
 *               - brandOffered
 *               - condition
 *               - priceKes
 *             properties:
 *               partRequestId:
 *                 type: string
 *                 example: "6aac4508bacb9ba29db43975"
 *               brandOffered:
 *                 type: string
 *                 example: "KYB Excel-G Japan"
 *               condition:
 *                 type: string
 *                 enum: [GENUINE_NEW, OEM_MATCH, AFTERMARKET, USED_TESTED]
 *                 example: "OEM_MATCH"
 *               priceKes:
 *                 type: number
 *                 example: 18500
 *               warrantyDays:
 *                 type: integer
 *                 example: 90
 *               availability:
 *                 type: string
 *                 enum: [IN_STOCK_COLLECT, SAME_DAY_DELIVERY, 1_TO_3_DAYS]
 *                 example: "IN_STOCK_COLLECT"
 *               partPhotoUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://res.cloudinary.com/autolog/shelf/kyb_shocks.jpg"
 *               notes:
 *                 type: string
 *                 example: "Includes mounting bushes and dust boot kit"
 *     responses:
 *       201:
 *         description: Quote submitted successfully with 48-hour price lock
 *       400:
 *         description: Invalid input or expired RFQ
 *       403:
 *         description: Forbidden (Dealers only)
 *       409:
 *         description: Active quote already submitted by this dealer
 */
router.post(
  '/quotes',
  authorize('dealer'),
  validate(createPartQuoteSchema),
  submitQuote
);

/**
 * @openapi
 * /api/v1/rfq/quotes/my:
 *   get:
 *     summary: Get all quotes submitted by logged-in dealer
 *     tags: [Spare Parts RFQ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quotes retrieved successfully
 *       403:
 *         description: Forbidden (Dealers only)
 */
router.get('/quotes/my', authorize('dealer'), getMySubmittedQuotes);

/**
 * @openapi
 * /api/v1/rfq/quotes/{id}/accept:
 *   patch:
 *     summary: Accept a quote (Atomically locks deal and rejects competing bids)
 *     description: Finalizes transaction with winning dealer and releases direct contact details for delivery/collection.
 *     tags: [Spare Parts RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quote accepted successfully
 *       400:
 *         description: Expired 48h price lock or already closed quote
 *       403:
 *         description: Forbidden (Not the RFQ owner)
 */
router.patch('/quotes/:id/accept', acceptQuote);

export default router;
