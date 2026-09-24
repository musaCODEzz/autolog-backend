import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

// Initialize client only if credentials exist (prevents crash during tests)
const client = accountSid && authToken && !accountSid.startsWith('ACtest')
  ? twilio(accountSid, authToken)
  : null;

export interface ISendWhatsAppParams {
  to: string; // Kenyan phone, e.g. +254712345678
  body: string;
}

/**
 * Sends a WhatsApp message using Twilio WhatsApp Sandbox/API
 */
export async function sendWhatsAppMessage({ to, body }: ISendWhatsAppParams): Promise<boolean> {
  try {
    // Format to WhatsApp URI format: whatsapp:+2547...
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = twilioNumber.startsWith('whatsapp:') ? twilioNumber : `whatsapp:${twilioNumber}`;

    if (!client) {
      console.log(`[WhatsApp Mock] Sending to ${formattedTo}: ${body}`);
      return true; // Return true in test/dev mock mode
    }

    const message = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body,
    });

    return !!message.sid;
  } catch (error) {
    console.error('[WhatsApp Service Error]:', error);
    return false;
  }
}
