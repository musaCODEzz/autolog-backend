import { Request, Response, NextFunction } from 'express';
import { Waitlist } from '../models/Waitlist';
import { JoinWaitlistInput } from '../validators/waitlist.validator';

/**
 * @desc    Submit early access waitlist application
 * @route   POST /api/v1/waitlist
 * @access  Public
 */
export const joinWaitlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as JoinWaitlistInput;

    // Check if email is already registered on waitlist
    const existing = await Waitlist.findOne({ email: data.email });
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'You are already registered on the AutoLog early access waitlist! We will notify you as soon as beta invites open.',
      });
      return;
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const entry = await Waitlist.create({
      ...data,
      ipAddress,
      userAgent,
    });

    const totalCount = await Waitlist.countDocuments();

    res.status(201).json({
      success: true,
      message: 'Karibu! You have been successfully added to the AutoLog Kenya early access waitlist.',
      data: {
        id: entry._id,
        fullName: entry.fullName,
        email: entry.email,
        phone: entry.phone,
        role: entry.role,
        waitlistPosition: totalCount,
        utmSource: entry.utmSource,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregate waitlist stats for public social proof
 * @route   GET /api/v1/waitlist/count
 * @access  Public
 */
export const getWaitlistCount = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const count = await Waitlist.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalJoined: count,
        message: `${count.toLocaleString()} Kenyan car owners, garages, and dealers on the waitlist.`,
      },
    });
  } catch (error) {
    next(error);
  }
};
