import axios from 'axios';
import { sendSMS } from './sms';

export async function sendNotification(phone: string, message: string): Promise<void> {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: `977${phone}`,
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } },
    );
  } catch (err: any) {
    // Auto-fallback to SMS on any WhatsApp failure
    // Error codes 131026 + 130472 = quota exhausted
    console.warn('[WhatsApp failed, falling back to SMS]', err?.response?.data);
    await sendSMS(phone, message);
  }
}

export const orderConfirmMessage = (orderNumber: string, total: number): string =>
  `DISTRO: Your order ${orderNumber} (Rs ${total}) has been confirmed. We will notify you when dispatched.`;

export const statusUpdateMessage = (orderNumber: string, status: string): string =>
  `DISTRO: Your order ${orderNumber} status has been updated to ${status}.`;
