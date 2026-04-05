import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from './prisma';

export { render };

const resend = new Resend(process.env.RESEND_API_KEY || 're_dev_placeholder');

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  type: string
): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL DEV] To: ${to} | Type: ${type} | Subject: ${subject}`);
    await prisma.emailLog.create({ data: { to, subject, type, status: 'dev_log' } });
    return;
  }
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM || 'DISTRO Nepal <no-reply@distronepal.com>',
      to,
      subject,
      html,
    });
    await prisma.emailLog.create({
      data: { to, subject, type, status: 'sent', messageId: result.data?.id },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EMAIL ERROR]', message);
    await prisma.emailLog.create({ data: { to, subject, type, status: 'failed' } });
  }
}
