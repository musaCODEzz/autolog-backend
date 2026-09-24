import twilio from 'twilio';

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (accountSid && authToken && !accountSid.startsWith('ACmock') && !accountSid.startsWith('ACtest')) {
    return twilio(accountSid, authToken);
  }
  return null;
}

export interface ISendWhatsAppParams {
  to: string; // Kenyan phone, e.g. +254712345678
  body: string;
}

/**
 * Sends a WhatsApp message using Twilio WhatsApp Sandbox/API
 */
export async function sendWhatsAppMessage({ to, body }: ISendWhatsAppParams): Promise<boolean> {
  try {
    const client = getTwilioClient();
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

    // Format to WhatsApp URI format: whatsapp:+2547...
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = twilioNumber.startsWith('whatsapp:') ? twilioNumber : `whatsapp:${twilioNumber}`;

    if (!client) {
      console.log(`[WhatsApp Mock Dispatch] To: ${formattedTo} | Message: ${body}`);
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
