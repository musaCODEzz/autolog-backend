import cron, { ScheduledTask } from 'node-cron';
import { Vehicle } from '../models/Vehicle';
import { IUser } from '../models/User';
import { generateCheckinToken } from '../utils/checkinToken';

export interface IDispatchResult {
  vehicleId: string;
  plateNumber: string;
  make: string;
  model: string;
  ownerName: string;
  ownerPhone: string;
  checkinUrl: string;
  promptSentAt: Date;
}

export interface IDispatchSummary {
  scannedAt: Date;
  staleCount: number;
  dispatchedCount: number;
  results: IDispatchResult[];
}

/**
 * Scans MongoDB for vehicles needing check-in and dispatches 72-hour magic links
 */
export const dispatchStaleCheckinPrompts = async (): Promise<IDispatchSummary> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 🛡️ ANTI-SPAM QUERY: Only active cars not updated in >= 7 days AND not prompted in >= 7 days
  const staleVehicles = await Vehicle.find({
    status: 'active',
    lastMileageUpdate: { $lte: sevenDaysAgo },
    $or: [
      { lastCheckinPromptSentAt: { $exists: false } },
      { lastCheckinPromptSentAt: null },
      { lastCheckinPromptSentAt: { $lte: sevenDaysAgo } },
    ],
  }).populate<{ owner: IUser }>('owner', 'name email phone');

  const results: IDispatchResult[] = [];
  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  for (const vehicle of staleVehicles) {
    const owner = vehicle.owner as IUser;
    if (!owner) continue;

    const token = generateCheckinToken(vehicle._id.toString());
    const checkinUrl = `${clientBaseUrl}/checkin?token=${token}`;
    const now = new Date();

    // Log the notification payload (In production: Africa's Talking SMS / SendGrid)
    console.log(
      `[DISPATCH] 📱 Check-in prompt sent to ${owner.name} (${owner.phone || owner.email}) for ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}): ${checkinUrl}`
    );

    // Update anti-spam audit timestamp
    vehicle.lastCheckinPromptSentAt = now;
    await vehicle.save();

    results.push({
      vehicleId: vehicle._id.toString(),
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      ownerName: owner.name,
      ownerPhone: owner.phone,
      checkinUrl,
      promptSentAt: now,
    });
  }

  return {
    scannedAt: new Date(),
    staleCount: staleVehicles.length,
    dispatchedCount: results.length,
    results,
  };
};

/**
 * Bootstraps the weekly automated cron schedule
 * Cadence: Every Sunday at 18:00 (6:00 PM) Nairobi Time (EAT)
 */
export const initCheckinCron = (): ScheduledTask => {
  console.log('⏰ [CRON] Check-in Dispatcher scheduled: Every Sunday at 18:00 EAT (Africa/Nairobi)');

  return cron.schedule(
    '0 18 * * 0',
    async () => {
      console.log('🚀 [CRON] Starting Sunday weekly check-in batch dispatch...');
      try {
        const summary = await dispatchStaleCheckinPrompts();
        console.log(
          `✅ [CRON] Sunday dispatch complete! Prompted ${summary.dispatchedCount} drivers across Kenya.`
        );
      } catch (error) {
        console.error('❌ [CRON] Error during Sunday check-in dispatch:', error);
      }
    },
    {
      timezone: 'Africa/Nairobi',
    }
  );
};
