import { Response, NextFunction } from 'express';
import { Vehicle } from '../models/Vehicle';
import { ServiceRecord } from '../models/ServiceRecord';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
    CreateVehicleInput,
    UpdateMileageInput,
    UpdateVehicleInput,
} from '../validators/vehicle.validator';
import {
    normalizeKenyanPlate,
    maskPlateNumber,
    maskChassisNumber,
} from '../utils/plate';
/**
 * @desc Register new vehicle to digital passport
 * @route POST /api/v1/vehicles
 * @access Private (owners only)
 */

export const createVehicle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            plateNumber,
            make,
            model,
            year,
            engine,
            transmission,
            fuelType,
            chassisNumber,
            mileageUnit,
            initialMileage,
            currentMileage,
            estDailyKm,
            photos,

        } = req.body as CreateVehicleInput;

        const normalizedPlate = normalizeKenyanPlate(plateNumber);

        // 1. check if plate already exists
        const existingVehicle = await Vehicle.findOne({ plateNumber: normalizedPlate });
        if (existingVehicle) {
            res.status(409).json({
                success: false,
                message: `Vehicle with plate number ${normalizedPlate} is already registered with AUTOLOG KE`,
            });
            return;
        }

        // 2. create vehicle linked to authenicated user
        const vehicle = await Vehicle.create({
            owner: req.user!._id,
            plateNumber: normalizedPlate,
            make,
            model,
            year,
            engine,
            transmission,
            fuelType,
            chassisNumber,
            mileageUnit,
            initialMileage,
            currentMileage,
            estDailyKm,
            photos,

        });

        res.status(201).json({
            success: true,
            message: 'Vehicle registered successfully to digital passport',
            data: { vehicle },
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc Get all vehicles owned by logged in user
 * @route GET /api/v1/vehicle
 * @access Private 
 */

export const getMyVehicles = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const vehicles = await Vehicle.find({ owner: req.user!._id }).sort({
            updatedAt: -1,
        });

        res.status(200).json({
            success: true,
            count: vehicles.length,
            data: { vehicles },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc Get single vehicle by ID 
 * @route GET /api/v1/vehicles/:id
 * @access Private
 */

export const getMyVehicleById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const vehicle = await Vehicle.findOne({
            _id: req.params.id,
            owner: req.user!._id,
        });

        if (!vehicle) {
            res.status(404).json({
                success: false,
                message: 'Vehicle not found or you do not have permission to view it',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: { vehicle },
        });
    } catch (error) {
        next(error);
    }
};

export const getVehicleById = getMyVehicleById;

/**
 * @desc update vehicle odometer reading
 * @route PATCH /api/v1/vehicles/:id/mileage
 * @access Private
 */

export const updateMileage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try{
        const { currentMileage } = req.body as UpdateMileageInput;
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user!._id,
    });
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found or you do not have permission to update it',
      });
      return;
    }
    // ANTI-ROLLBACK DEFENSE: Mileage can never decrease!
    if (currentMileage < vehicle.currentMileage) {
      res.status(400).json({
        success: false,
        message: `Odometer rollback detected! New mileage (${currentMileage} ${vehicle.mileageUnit}) cannot be lower than current recorded mileage (${vehicle.currentMileage} ${vehicle.mileageUnit}).`,
      });
      return;
    }
    vehicle.currentMileage = currentMileage;
    vehicle.lastMileageUpdate = new Date();
    await vehicle.save();
    res.status(200).json({
      success: true,
      message: 'Odometer reading updated successfully',
      data: { vehicle },
    });

    } catch ( error ){
        next(error);
    }
};

/**
 * @desc Update Vehicle Profile details
 * @route PATCH /api/v1/vehicles/:id
 * @access Private
 */

export const updateVehicle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try{
        const updates = req.body as UpdateVehicleInput;
        const vehicle = await Vehicle.findOneAndUpdate(
            {_id: req.params.id, owner: req.user!._id},
            { $set: updates },
            { new: true, runValidators: true }
        );
        if(!vehicle){
            res.status(404).json({
            success: false,
            message: 'Vehicle not found or you do not have permission to edit it',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Vehicle profile updated successfully',
            data: { vehicle },
        });

    } catch (error) {
        next(error)
    }
}

/**
 * @desc    Public Digital Vehicle Passport (Sanitized, Masked & Trust-Scored)
 * @route   GET /api/v1/vehicles/passport/:slug
 * @access  Public
 */
export const getPublicPassport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const slug = (Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug)?.toLowerCase();

    if (!slug) {
      res.status(400).json({
        success: false,
        message: 'Valid passport slug is required',
      });
      return;
    }

    const vehicle = await Vehicle.findOne({
      passportSlug: slug,
      status: 'active',
    }).select('-owner -__v');
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: 'Vehicle passport not found or is currently private/archived',
      });
      return;
    }
    // 1. Fetch public service records
    const serviceRecords = await ServiceRecord.find({ vehicle: vehicle._id })
      .select('-loggedBy -__v')
      .sort({ serviceDate: -1 });
    // 2. Compute Trust Verification Metrics
    const totalServices = serviceRecords.length;
    const tier3PartnerServices = serviceRecords.filter(
      (r) => r.verificationTier === 'TIER_3_PARTNER'
    ).length;
    const tier2DocumentedServices = serviceRecords.filter(
      (r) => r.verificationTier === 'TIER_2_DOCUMENTED'
    ).length;
    // 3. Construct Privacy-Safe Passport Response
    const publicPassport = {
      passportSlug: vehicle.passportSlug,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      engine: vehicle.engine,
      mileageUnit: vehicle.mileageUnit,
      currentMileage: vehicle.currentMileage,
      lastMileageUpdate: vehicle.lastMileageUpdate,
      // PRIVACY SHIELD: Masked identifiers
      maskedPlate: maskPlateNumber(vehicle.plateNumber),
      maskedChassis: maskChassisNumber(vehicle.chassisNumber),
      photos: vehicle.photos,
      trustScore: {
        totalServices,
        tier3PartnerVerifiedCount: tier3PartnerServices,
        tier2DocumentedCount: tier2DocumentedServices,
        verifiedPartnerStatus: tier3PartnerServices > 0,
      },
      serviceHistory: serviceRecords,
    };
    res.status(200).json({
      success: true,
      data: { passport: publicPassport },
    });
  } catch (error) {
    next(error);
  }
};
