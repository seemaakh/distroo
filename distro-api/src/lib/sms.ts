import axios from 'axios';

export async function sendSMS(phone: string, message: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS DEV] To: ${phone} | Message: ${message}`);
    return;
  }
  await axios.post('https://apisms.sparrowsms.com/v2/sms/', {
    token: process.env.SPARROW_SMS_TOKEN,
    from: process.env.SPARROW_SMS_FROM,
    to: phone,
    text: message,
  });
}

export const otpMessage = (otp: string) =>
  `Your DISTRO verification code is ${otp}. Valid for 10 minutes. Do not share.`;
