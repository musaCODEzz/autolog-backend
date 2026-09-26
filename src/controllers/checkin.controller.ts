import { Request, Response, NextFunction } from 'express';
import { Vehicle } from '../models/Vehicle';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateCheckinToken, verifyCheckinToken } from '../utils/checkinToken';
import { SubmitCheckinInput } from '../validators/checkin.validator';

/**
 * @desc    Generate a single-purpose, signed 72-hour check-in link for a vehicle
 * @route   POST /api/v1/vehicles/:id/checkin-token
 * @access  Private (Owner or Admin)
 */
export const generateVehicleCheckinToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter =
      req.user!.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user!._id };

    const vehicle = await Vehicle.findOne(filter);

    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found or you do not have permission to access it',
      });
      return;
    }

    const token = generateCheckinToken(vehicle._id.toString());
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const checkinUrl = `${clientBaseUrl}/checkin?token=${token}`;

    res.status(200).json({
      success: true,
      message: 'Check-in link generated successfully',
      data: {
        token,
        checkinUrl,
        expiresIn: '72h',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vehicle details for mobile check-in screen using magic token
 * @route   GET /api/v1/vehicles/checkin/:token
 * @access  Public (Token Governed)
 */
export const getCheckinDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.params.token as string;

    let payload;
    try {
      payload = verifyCheckinToken(token);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired check-in token. Please request a new link.',
      });
      return;
    }

    const vehicle = await Vehicle.findById(payload.vehicleId);

    if (!vehicle || vehicle.status !== 'active') {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found or is no longer active',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        vehicleId: vehicle._id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.currentMileage,
        mileageUnit: vehicle.mileageUnit,
        estDailyKm: vehicle.estDailyKm,
        lastMileageUpdate: vehicle.lastMileageUpdate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit new odometer reading via magic token
 * @route   POST /api/v1/vehicles/checkin/:token
 * @access  Public (Token Governed)
 */
export const submitCheckin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.params.token as string;
    const { newMileage } = req.body as SubmitCheckinInput;

    let payload;
    try {
      payload = verifyCheckinToken(token);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired check-in token. Please request a new link.',
      });
      return;
    }

    const vehicle = await Vehicle.findById(payload.vehicleId);

    if (!vehicle || vehicle.status !== 'active') {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found or is no longer active',
      });
      return;
    }

    // 🛡️ ANTI-ROLLBACK DEFENSE
    if (newMileage < vehicle.currentMileage) {
      res.status(400).json({
        success: false,
        message: `Odometer rollback detected! New mileage (${newMileage.toLocaleString()} ${vehicle.mileageUnit}) cannot be lower than current recorded mileage (${vehicle.currentMileage.toLocaleString()} ${vehicle.mileageUnit}).`,
      });
      return;
    }

    const prevMileage = vehicle.currentMileage;
    const lastUpdate = vehicle.lastMileageUpdate || vehicle.createdAt;
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastUpdate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // 📊 DYNAMIC BURN RATE RECALIBRATION
    let recalculatedDailyKm = vehicle.estDailyKm;
    if (diffDays >= 1 && newMileage > prevMileage) {
      const calculatedRate = Math.round((newMileage - prevMileage) / diffDays);
      recalculatedDailyKm = Math.min(Math.max(calculatedRate, 1), 1000);
      vehicle.estDailyKm = recalculatedDailyKm;
    }

    vehicle.currentMileage = newMileage;
    vehicle.lastMileageUpdate = now;
    await vehicle.save();

    res.status(200).json({
      success: true,
      message: `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}) odometer updated to ${newMileage.toLocaleString()} ${vehicle.mileageUnit}`,
      data: {
        vehicleId: vehicle._id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        previousMileage: prevMileage,
        currentMileage: vehicle.currentMileage,
        distanceTraveled: newMileage - prevMileage,
        recalculatedDailyKm: vehicle.estDailyKm,
        lastMileageUpdate: vehicle.lastMileageUpdate,
      },
    });
  } catch (error) {
    next(error);
  }
};
