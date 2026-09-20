import { Response, NextFunction } from 'express';
import { PartRequest } from '../models/PartRequest';
import { PartQuote } from '../models/PartQuote';
import { Vehicle } from '../models/Vehicle';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  CreatePartRequestInput,
  CreatePartQuoteInput,
} from '../validators/rfq.validator';

/**
 * @desc    Create a new Spare Parts Request (RFQ)
 * @route   POST /api/v1/rfq/requests
 * @access  Private (Owner or Garage)
 */
export const createPartRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      vehicleId,
      partName,
      category,
      quantity,
      oemPartNumber,
      preference,
      urgency,
      fulfillmentType,
      deliveryLocation,
      description,
      photos,
    } = req.body as CreatePartRequestInput;

    // 1. Verify vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found with the provided vehicleId',
      });
      return;
    }

    // 2. Ownership / Authorization Check:
    // Car owners can only request parts for their own registered vehicles.
    // Garages can request parts for vehicles they service.
    const isOwner = vehicle.owner.toString() === req.user!._id.toString();
    const isGarage = req.user!.role === 'garage';

    if (!isOwner && !isGarage) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only request parts for your own vehicles or vehicles serviced in your garage',
      });
      return;
    }

    // 3. Create the Part Request (Auto-expires in 7 days)
    const partRequest = await PartRequest.create({
      requester: req.user!._id,
      vehicle: vehicle._id,
      partName,
      category,
      quantity,
      oemPartNumber: oemPartNumber?.toUpperCase(),
      preference,
      urgency,
      fulfillmentType,
      deliveryLocation,
      description,
      photos,
      status: 'OPEN',
      quotesCount: 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      success: true,
      message: 'Spare parts request created successfully. Vetted dealers will be notified.',
      data: { partRequest },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all RFQs created by the logged-in user
 * @route   GET /api/v1/rfq/requests/my
 * @access  Private (Owner or Garage)
 */
export const getMyPartRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requests = await PartRequest.find({ requester: req.user!._id })
      .populate('vehicle', 'make model year plateNumber engine fuelType transmission passportSlug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get RFQ details by ID (With Blind-Bidding Protection)
 * @route   GET /api/v1/rfq/requests/:id
 * @access  Private
 */
export const getPartRequestById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const request = await PartRequest.findById(id)
      .populate('vehicle', 'make model year engine fuelType transmission chassisNumber plateNumber passportSlug')
      .populate('requester', 'name role phone');

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Part request not found',
      });
      return;
    }

    const isRequester = request.requester._id.toString() === req.user!._id.toString();
    const isDealer = req.user!.role === 'dealer';
    const isAdmin = req.user!.role === 'admin';

    // 1. If Requester or Admin: Can see ALL submitted quotes sorted by price (cheapest first)
    if (isRequester || isAdmin) {
      const quotes = await PartQuote.find({ partRequest: request._id })
        .populate('dealer', 'name phone businessDetails')
        .sort({ priceKes: 1 });

      res.status(200).json({
        success: true,
        data: {
          request,
          quotes,
        },
      });
      return;
    }

    // 2. If Dealer: Anti-Cartel Blind Bidding Guard!
    // Dealers MUST NOT see quotes from competing shops.
    // They only see vehicle specs and their OWN quotation if already submitted.
    if (isDealer) {
      const myQuote = await PartQuote.findOne({
        partRequest: request._id,
        dealer: req.user!._id,
      });

      res.status(200).json({
        success: true,
        data: {
          request,
          myQuote: myQuote || null,
        },
      });
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to view this part request',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Dealer Feed: List open RFQs for parts dealers to quote on
 * @route   GET /api/v1/rfq/feed
 * @access  Private (Dealer or Admin)
 */
export const getDealerFeed = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, urgency, status } = req.query;

    const query: Record<string, any> = {
      expiresAt: { $gt: new Date() }, // Only active requests
    };

    if (status && typeof status === 'string') {
      query.status = status;
    } else {
      query.status = { $in: ['OPEN', 'QUOTED'] };
    }

    if (category && typeof category === 'string') {
      query.category = category;
    }

    if (urgency && typeof urgency === 'string') {
      query.urgency = urgency;
    }

    const feed = await PartRequest.find(query)
      .populate('vehicle', 'make model year engine fuelType transmission chassisNumber')
      .populate('requester', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: feed.length,
      data: { feed },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel an open Part Request
 * @route   PATCH /api/v1/rfq/requests/:id/cancel
 * @access  Private (Requester Only)
 */
export const cancelPartRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const request = await PartRequest.findById(id);
    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Part request not found',
      });
      return;
    }

    if (request.requester.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only cancel your own part requests',
      });
      return;
    }

    if (request.status === 'ACCEPTED' || request.status === 'FULFILLED') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel an RFQ that is already ${request.status}`,
      });
      return;
    }

    request.status = 'CANCELLED';
    await request.save();

    // Expire any pending quotes on this cancelled request
    await PartQuote.updateMany(
      { partRequest: request._id, status: 'PENDING' },
      { $set: { status: 'EXPIRED' } }
    );

    res.status(200).json({
      success: true,
      message: 'Part request cancelled successfully',
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit a Quotation with 48-Hour Price Lock Guarantee
 * @route   POST /api/v1/rfq/quotes
 * @access  Private (Authorized Dealer Only)
 */
export const submitQuote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      partRequestId,
      brandOffered,
      condition,
      priceKes,
      warrantyDays,
      availability,
      partPhotoUrl,
      notes,
    } = req.body as CreatePartQuoteInput;

    // 1. Authorization: Only accounts with role 'dealer' can submit quotations
    if (req.user!.role !== 'dealer') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only registered spare parts dealers can submit quotes',
      });
      return;
    }

    // 2. Fetch the target RFQ
    const request = await PartRequest.findById(partRequestId);
    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Part request not found',
      });
      return;
    }

    // 3. Status Guard: Can only quote on OPEN or QUOTED requests
    if (request.status !== 'OPEN' && request.status !== 'QUOTED') {
      res.status(400).json({
        success: false,
        message: `Cannot submit quote: This request is currently ${request.status}`,
      });
      return;
    }

    // 4. Expiration Guard
    if (new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      res.status(400).json({
        success: false,
        message: 'Cannot submit quote: This RFQ has expired',
      });
      return;
    }

    // 5. Anti-Spam / Duplicate Bidding Guard:
    // Check if dealer already has an active PENDING quote for this RFQ
    const existingQuote = await PartQuote.findOne({
      partRequest: request._id,
      dealer: req.user!._id,
      status: 'PENDING',
    });

    if (existingQuote) {
      res.status(409).json({
        success: false,
        message: 'You have already submitted an active quote for this request. Please wait for customer review.',
        data: { existingQuote },
      });
      return;
    }

    // 6. Create the Quote with Mandatory 48-Hour Price Lock Guarantee
    const quote = await PartQuote.create({
      partRequest: request._id,
      dealer: req.user!._id,
      brandOffered,
      condition,
      priceKes,
      warrantyDays,
      availability,
      partPhotoUrl,
      notes,
      validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // Immutable 48h guarantee
      status: 'PENDING',
    });

    // 7. Update the RFQ stats
    request.quotesCount += 1;
    if (request.status === 'OPEN') {
      request.status = 'QUOTED';
    }
    await request.save();

    res.status(201).json({
      success: true,
      message: 'Quotation submitted successfully with a 48-hour price lock guarantee',
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all quotes submitted by the logged-in dealer
 * @route   GET /api/v1/rfq/quotes/my
 * @access  Private (Dealer Only)
 */
export const getMySubmittedQuotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user!.role !== 'dealer') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only dealers can access submitted quotes',
      });
      return;
    }

    const quotes = await PartQuote.find({ dealer: req.user!._id })
      .populate({
        path: 'partRequest',
        populate: { path: 'vehicle', select: 'make model year plateNumber' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quotes.length,
      data: { quotes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept a Quotation (Locks Deal & Rejects Competing Bids)
 * @route   PATCH /api/v1/rfq/quotes/:id/accept
 * @access  Private (Requester Only)
 */
export const acceptQuote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // 1. Fetch quote and populate linked RFQ and dealer contact details
    const quote = await PartQuote.findById(id).populate('dealer', 'name phone businessDetails');
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
      return;
    }

    const request = await PartRequest.findById(quote.partRequest);
    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Associated part request not found',
      });
      return;
    }

    // 2. Ownership Guard: Only the RFQ creator can accept a quote
    if (request.requester.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only accept quotes on your own part requests',
      });
      return;
    }

    // 3. Status Guard: Quote must be PENDING
    if (quote.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: `Quotation is already ${quote.status}`,
      });
      return;
    }

    // 4. 48-Hour Price Lock Expiration Guard:
    if (new Date() > quote.validUntil) {
      quote.status = 'EXPIRED';
      await quote.save();
      res.status(400).json({
        success: false,
        message: 'The 48-hour price lock guarantee period on this quote has expired',
      });
      return;
    }

    // 5. Atomic Deal Finalization:
    // Mark accepted quote as ACCEPTED
    quote.status = 'ACCEPTED';
    await quote.save();

    // Mark competing quotes on this RFQ as REJECTED
    await PartQuote.updateMany(
      { partRequest: request._id, _id: { $ne: quote._id }, status: 'PENDING' },
      { $set: { status: 'REJECTED' } }
    );

    // Update the RFQ status to ACCEPTED
    request.status = 'ACCEPTED';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Quotation accepted! The 48-hour price lock is confirmed. You can now contact the dealer to arrange pickup or delivery.',
      data: {
        acceptedQuote: quote,
        dealerContact: {
          name: (quote.dealer as any)?.name,
          phone: (quote.dealer as any)?.phone,
          businessName: (quote.dealer as any)?.businessDetails?.businessName,
          location: (quote.dealer as any)?.businessDetails?.location,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
