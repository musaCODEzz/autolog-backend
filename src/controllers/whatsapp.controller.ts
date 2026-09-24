import { Request, Response } from 'express';
import { User } from "../models/User";
import { Vehicle } from '../models/Vehicle';
import { formatKenyanPhone } from "../utils/phone";
import { sendWhatsAppMessage } from '../services/whatsapp.service';

/**
 * Helper: Parses loose text replies into an integer mileage
 * Supports: "79200", "79,200", "79200km", "80k", "Niko 81500"
 */
export function parseMileageFromText(text: string): number | null {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  // Check for "80k" or "79.5k" format
  const kMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // Check for standard numbers with optional commas or "km" suffix
  // e.g. "79,200", "79200", "79200 km", "Niko 82000"
  const digitsOnly = cleaned.replace(/,/g, '');
  const numberMatch = digitsOnly.match(/\b(\d{4,7})\b/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  return null;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function sendTwiML(res: Response, message: string): void {
  res.status(200).type('text/xml').send(`<Response><Message>${escapeXml(message)}</Message></Response>`);
}

/**
 * Handles Incoming WhatsApp Webhook from Twilio
 * Route: POST /api/v1/whatsapp/webhook
 */
export async function handleIncomingWhatsApp(req: Request, res: Response): Promise<void> {
  try {
    // Twilio sends urlencoded body with From: 'whatsapp:+254...' and Body: '79200'
    const rawFrom = req.body.From || '';
    const incomingText = req.body.Body || '';

    // 1. Clean and normalize phone number
    const rawPhone = rawFrom.replace('whatsapp:', '').trim();
    const normalizedPhone = formatKenyanPhone(rawPhone);

    if (!normalizedPhone) {
      res.status(400).send('<Response></Response>');
      return;
    }

    // 2. Find user by phone
    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      sendTwiML(res, 'AutoLog: Your phone number is not registered. Sign up at https://autolog.ke to track your car.');
      return;
    }

    // 3. Find active vehicles owned by this user
    const vehicles = await Vehicle.find({ owner: user._id, status: 'active' }).sort({ lastMileageUpdate: 1 });
    if (vehicles.length === 0) {
      sendTwiML(res, 'AutoLog: You have no active vehicles registered under your account.');
      return;
    }

    // 4. Parse mileage from driver's text
    const newMileage = parseMileageFromText(incomingText);
    if (!newMileage) {
      sendTwiML(res, 'AutoLog: We could not understand that number. Please reply with just your dashboard digits, e.g. "79200".');
      return;
    }

    // 5. Select target vehicle (if multi-car, pick the one mentioned or the oldest updated)
    let targetVehicle = vehicles[0];
    if (vehicles.length > 1) {
      // Check if user included plate characters in their text (e.g. "79200 KDM")
      const matched = vehicles.find((v) => incomingText.toUpperCase().includes(v.plateNumber.replace(/\s/g, '')));
      if (matched) targetVehicle = matched;
    }

    // 6. Anti-Rollback Mathematical Guard
    if (newMileage < targetVehicle.currentMileage) {
      sendTwiML(
        res,
        `⚠️ AutoLog Alert: Reported mileage (${newMileage.toLocaleString()} km) cannot be less than your last verified reading (${targetVehicle.currentMileage.toLocaleString()} km). Odometer rollback rejected.`
      );
      return;
    }

    // 7. Recalculate dynamic daily burn rate
    const now = new Date();
    const daysElapsed = Math.max(
      1,
      Math.round((now.getTime() - new Date(targetVehicle.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const calculatedDailyBurn = Math.round((newMileage - targetVehicle.initialMileage) / daysElapsed);
    const updatedDailyKm = calculatedDailyBurn > 5 && calculatedDailyBurn < 500 ? calculatedDailyBurn : targetVehicle.estDailyKm;

    // 8. Update vehicle in database
    targetVehicle.currentMileage = newMileage;
    targetVehicle.estDailyKm = updatedDailyKm;
    targetVehicle.lastMileageUpdate = now;
    await targetVehicle.save();

    // 9. Send success confirmation via native TwiML reply
    sendTwiML(
      res,
      `✅ AutoLog: Updated! ${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.plateNumber}) odometer set to ${newMileage.toLocaleString()} km. Driving burn rate: ~${updatedDailyKm} km/day.`
    );
  } catch (error) {
    console.error('[WhatsApp Webhook Controller Error]:', error);
    res.status(500).send('<Response></Response>');
  }
}
