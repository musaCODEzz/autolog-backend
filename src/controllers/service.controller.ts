import { Response, NextFunction } from 'express';
import { ServiceRecord, VerificationTier } from '../models/ServiceRecord';
import { Vehicle } from '../models/Vehicle';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CreateServiceRecordInput } from '../validators/service.validator';

/**
 * @desc    Create a new service record for a vehicle
 * @route   POST /api/v1/services
 * @access  Private (Owner or Partner Garage)
 */
export const createServiceRecord = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      vehicleId,
      serviceType,
      serviceDate,
      mileageAtService,
      costKes,
      garageName,
      mechanicPhone,
      description,
      partsReplaced,
      receiptUrl,
    } = req.body as CreateServiceRecordInput;

    // 1. Verify that the vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
      return;
    }

    // 2. Authorization Guard: Only the vehicle owner OR a garage can log service records
    const isOwner = vehicle.owner.toString() === req.user!._id.toString();
    const isGarage = req.user!.role === 'garage';

    if (!isOwner && !isGarage) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You must be the vehicle owner or an authorized garage to log service records',
      });
      return;
    }

    // 3. Trust Tier Assignment
    // TIER_3: Authenticated garage with verified partner badge
    // TIER_2: Owner/fundi with physical receipt or job card URL
    // TIER_1: Self-reported entry without receipt proof
    let verificationTier: VerificationTier = 'TIER_1_SELF';

    const isVerifiedPartner =
      req.user!.role === 'garage' && req.user!.businessDetails?.isVerifiedPartner === true;

    if (isVerifiedPartner) {
      verificationTier = 'TIER_3_PARTNER';
    } else if (receiptUrl) {
      verificationTier = 'TIER_2_DOCUMENTED';
    }

    // 4. Create the service record (pre-save hook auto-flags isBackdated if >30 days)
    const serviceRecord = await ServiceRecord.create({
      vehicle: vehicle._id,
      loggedBy: req.user!._id,
      serviceType,
      serviceDate: new Date(serviceDate),
      mileageAtService,
      costKes,
      garageName,
      mechanicPhone,
      description,
      partsReplaced,
      receiptUrl,
      verificationTier,
    });

    // 5. Automatic Odometer Progression: Advance vehicle mileage if service mileage is higher
    if (mileageAtService > vehicle.currentMileage) {
      vehicle.currentMileage = mileageAtService;
      vehicle.lastMileageUpdate = new Date();
      await vehicle.save();
    }

    res.status(201).json({
      success: true,
      message: 'Service record logged successfully',
      data: { serviceRecord },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all service records for a vehicle (Chronological history)
 * @route   GET /api/v1/services/vehicle/:vehicleId
 * @access  Private (Owner or Garage)
 */
export const getVehicleServiceHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const vehicleId = Array.isArray(req.params.vehicleId)
      ? req.params.vehicleId[0]
      : req.params.vehicleId;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
      return;
    }

    const records = await ServiceRecord.find({ vehicle: vehicleId })
      .populate('loggedBy', 'name role businessDetails.businessName')
      .sort({ serviceDate: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: { serviceHistory: records },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single service record by ID
 * @route   GET /api/v1/services/:id
 * @access  Private
 */
export const getServiceRecordById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const record = await ServiceRecord.findById(id)
      .populate('vehicle', 'make model year plateNumber passportSlug')
      .populate('loggedBy', 'name role businessDetails.businessName');

    if (!record) {
      res.status(404).json({
        success: false,
        message: 'Service record not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { serviceRecord: record },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Attach receipt proof to a service record and upgrade verification tier
 * @route   PATCH /api/v1/services/:id/receipt
 * @access  Private (Vehicle Owner, Logger, or Admin)
 */
export const attachServiceReceipt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { receiptUrl } = req.body;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // 1. Find the service record
    const record = await ServiceRecord.findById(id);
    if (!record) {
      res.status(404).json({
        success: false,
        message: 'Service record not found',
      });
      return;
    }

    // 2. Authorization check: Must be vehicle owner, logger, or admin
    const vehicle = await Vehicle.findById(record.vehicle);
    const isOwner = vehicle && vehicle.owner.toString() === req.user!._id.toString();
    const isLogger = record.loggedBy.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isLogger && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to attach a receipt to this service record',
      });
      return;
    }

    // 3. Upgrade verification tier from TIER_1_SELF to TIER_2_DOCUMENTED
    if (record.verificationTier === 'TIER_1_SELF') {
      record.verificationTier = 'TIER_2_DOCUMENTED';
    }

    // 4. Update receipt URL and persist to MongoDB
    record.receiptUrl = receiptUrl;
    await record.save();

    res.status(200).json({
      success: true,
      message: 'Receipt attached and verification tier upgraded successfully',
      data: { serviceRecord: record },
    });
  } catch (error) {
    next(error);
  }
};
