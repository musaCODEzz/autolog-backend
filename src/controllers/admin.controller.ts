import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { ServiceRecord } from '../models/ServiceRecord';
import { PartRequest } from '../models/PartRequest';
import { PartQuote } from '../models/PartQuote';
import { AuthRequest } from '../middlewares/auth.middleware';
import { VerifyGarageInput, SuspendUserInput } from '../validators/admin.validator';

/**
 * @desc    Verify or Revoke Garage Partner Accreditation (Unlocks Tier 3)
 * @route   PATCH /api/v1/admin/garages/:id/verify
 * @access  Private (Admin Only)
 */
export const verifyGaragePartner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { isVerifiedPartner } = req.body as VerifyGarageInput;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Role check: Only garages can be partner verified
    if (user.role !== 'garage') {
      res.status(400).json({
        success: false,
        message: `Cannot verify partner status: User has role '${user.role}', but only 'garage' accounts can be accredited`,
      });
      return;
    }

    if (!user.businessDetails) {
      res.status(400).json({
        success: false,
        message: 'Garage is missing business details',
      });
      return;
    }

    user.businessDetails.isVerifiedPartner = isVerifiedPartner;
    await user.save();

    res.status(200).json({
      success: true,
      message: isVerifiedPartner
        ? `Garage '${user.businessDetails.businessName}' has been accredited as a Verified Partner (Tier 3 unlocked)`
        : `Partner accreditation revoked for garage '${user.businessDetails.businessName}'`,
      data: {
        garage: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessDetails: user.businessDetails,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Suspend or Reactivate a User Account
 * @route   PATCH /api/v1/admin/users/:id/suspend
 * @access  Private (Admin Only)
 */
export const toggleUserSuspension = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { isSuspended, reason } = req.body as SuspendUserInput;

    // Self-Lockout Defense: Admin cannot suspend themselves!
    if (id === req.user!._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'Security Guard: You cannot suspend your own admin account',
      });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    user.isSuspended = isSuspended;
    user.suspensionReason = isSuspended ? reason || 'Administrative suspension' : undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: isSuspended
        ? `Account ${user.email} (${user.role}) has been suspended. Active sessions are invalidated.`
        : `Account ${user.email} has been reactivated successfully.`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isSuspended: user.isSuspended,
          suspensionReason: user.suspensionReason,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Platform Analytics & Health Dashboard
 * @route   GET /api/v1/admin/stats
 * @access  Private (Admin Only)
 */
export const getPlatformStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      ownersCount,
      garagesCount,
      verifiedGaragesCount,
      dealersCount,
      totalVehicles,
      totalServices,
      tier3Count,
      tier2Count,
      tier1Count,
      totalRfqs,
      totalQuotes,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'garage' }),
      User.countDocuments({ role: 'garage', 'businessDetails.isVerifiedPartner': true }),
      User.countDocuments({ role: 'dealer' }),
      Vehicle.countDocuments(),
      ServiceRecord.countDocuments(),
      ServiceRecord.countDocuments({ verificationTier: 'TIER_3_PARTNER' }),
      ServiceRecord.countDocuments({ verificationTier: 'TIER_2_DOCUMENTED' }),
      ServiceRecord.countDocuments({ verificationTier: 'TIER_1_SELF' }),
      PartRequest.countDocuments(),
      PartQuote.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          owners: ownersCount,
          garages: garagesCount,
          verifiedGarages: verifiedGaragesCount,
          dealers: dealersCount,
        },
        vehicles: {
          totalRegistered: totalVehicles,
        },
        services: {
          totalLogged: totalServices,
          tier3PartnerVerified: tier3Count,
          tier2Documented: tier2Count,
          tier1SelfReported: tier1Count,
        },
        marketplace: {
          totalRfqs,
          totalQuotes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List Users for Admin Review (with Search & Filters)
 * @route   GET /api/v1/admin/users
 * @access  Private (Admin Only)
 */
export const listUsersForAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { role, isVerifiedPartner, isSuspended, search } = req.query;

    const query: Record<string, any> = {};

    if (role && typeof role === 'string') {
      query.role = role;
    }

    if (isVerifiedPartner !== undefined) {
      query['businessDetails.isVerifiedPartner'] = isVerifiedPartner === 'true';
    }

    if (isSuspended !== undefined) {
      query.isSuspended = isSuspended === 'true';
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'businessDetails.businessName': { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};
