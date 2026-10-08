import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Vehicle } from '../models/Vehicle';
import { ServiceRecord } from '../models/ServiceRecord';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * @desc    Get Vehicle Total Cost of Ownership (TCO) & Spend Analytics
 * @route   GET /api/v1/vehicles/:id/analytics
 * @access  Private (Owner or Admin)
 */
export const getVehicleAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isOwnerOrAdmin =
      req.user?.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user!._id };

    const vehicle = await Vehicle.findOne(isOwnerOrAdmin);

    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found or you do not have permission to view its analytics',
      });
      return;
    }

    const vehicleObjectId = new mongoose.Types.ObjectId(req.params.id as string);

    // 1. Aggregation Pipeline: Spend Breakdown by Service Category (Proportionally Allocated)
    const categoryStats = await ServiceRecord.aggregate([
      { $match: { vehicle: vehicleObjectId } },
      {
        $addFields: {
          allocatedCostKes: {
            $cond: [
              { $gt: [{ $size: '$serviceType' }, 0] },
              { $divide: ['$costKes', { $size: '$serviceType' }] },
              '$costKes',
            ],
          },
        },
      },
      { $unwind: '$serviceType' },
      {
        $group: {
          _id: '$serviceType',
          totalAmountKes: { $sum: '$allocatedCostKes' },
          serviceCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmountKes: -1 } },
    ]);

    // 2. Aggregation Pipeline: Overall Financial Summary
    const overallStats = await ServiceRecord.aggregate([
      { $match: { vehicle: vehicleObjectId } },
      {
        $group: {
          _id: null,
          totalSpendKes: { $sum: '$costKes' },
          totalRecords: { $sum: 1 },
          firstServiceDate: { $min: '$serviceDate' },
          latestServiceDate: { $max: '$serviceDate' },
        },
      },
    ]);

    const totalSpendKes = overallStats[0]?.totalSpendKes || 0;
    const totalRecords = overallStats[0]?.totalRecords || 0;
    const firstServiceDate = overallStats[0]?.firstServiceDate;

    // 3. Distance & Cost Per Kilometer Calculation
    const trackedDistanceKm = Math.max(0, vehicle.currentMileage - vehicle.initialMileage);
    const costPerKmKes =
      trackedDistanceKm > 0
        ? Number((totalSpendKes / trackedDistanceKm).toFixed(2))
        : 0;

    // 4. Monthly Average Expense Calculation
    const startDate = firstServiceDate ? new Date(firstServiceDate) : new Date(vehicle.createdAt);
    const now = new Date();
    const monthsElapsed = Math.max(
      1,
      (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()) +
        1
    );
    const monthlyAverageSpendKes = Math.round(totalSpendKes / monthsElapsed);

    // 5. Enrich Category Breakdown with Percentages
    const categoryBreakdown = categoryStats.map((cat) => ({
      category: cat._id,
      totalAmountKes: cat.totalAmountKes,
      serviceCount: cat.serviceCount,
      percentageOfTotal:
        totalSpendKes > 0
          ? Number(((cat.totalAmountKes / totalSpendKes) * 100).toFixed(1))
          : 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        vehicle: {
          id: vehicle._id,
          plateNumber: vehicle.plateNumber,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          initialMileage: vehicle.initialMileage,
          currentMileage: vehicle.currentMileage,
          trackedDistanceKm,
        },
        summary: {
          totalSpendKes,
          totalServicesLogged: totalRecords,
          costPerKmKes,
          monthlyAverageSpendKes,
          monthsTracked: monthsElapsed,
        },
        categoryBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
