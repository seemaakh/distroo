import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { requireAuth, isAdmin } from '../middleware/auth';
import { withTransaction } from '../lib/transaction';
import { sendEmail, render } from '../lib/email';
import { PaymentConfirmEmail } from '../emails/PaymentConfirmEmail';

const router = Router();

/** Safely extract a scalar string from req.query or req.params. */
const qs = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;

function esewaSignature(message: string): string {
  return crypto
    .createHmac('sha256', process.env.ESEWA_SECRET_KEY!)
    .update(message)
    .digest('base64');
}

// ─── GET /api/payments/webhook/esewa — eSewa redirect callback ───────────────
// eSewa redirects buyer to success URL with ?data=<base64-encoded-JSON>
router.get('/webhook/esewa', async (req: Request, res: Response): Promise<void> => {
  const rawData = qs(req.query.data as string | string[] | undefined);
  if (!rawData) {
    res.status(400).json({ error: 'Missing data param' });
    return;
  }

  let payload: Record<string, string>;
  try {
    payload = JSON.parse(Buffer.from(rawData, 'base64').toString('utf-8'));
  } catch {
    res.status(400).json({ error: 'Invalid base64 data' });
    return;
  }

  // Verify HMAC signature
  const signedFields: string[] = (payload.signed_field_names ?? '').split(',');
  const signMsg = signedFields.map((f) => `${f}=${payload[f]}`).join(',');
  const expected = esewaSignature(signMsg);

  if (expected !== payload.signature) {
    res.status(400).json({ error: 'Signature mismatch' });
    return;
  }

  if (payload.status !== 'COMPLETE') {
    res.status(200).json({ message: 'Payment not complete, ignored' });
    return;
  }

  const transactionUuid = payload.transaction_uuid;

  const order = await prisma.order.findUnique({
    where:   { id: transactionUuid },
    include: { buyer: { select: { phone: true, email: true, id: true, storeName: true } } },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Idempotency: already paid → return 200 without duplicate writes
  if (order.paymentStatus === 'PAID') {
    res.status(200).json({ message: 'Already processed' });
    return;
  }

  await withTransaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data:  { paymentStatus: 'PAID' },
    });

    await tx.payment.create({
      data: {
        orderId:     order.id,
        method:      'ESEWA',
        status:      'PAID',
        amount:      order.total,
        reference:   payload.transaction_code ?? transactionUuid,
        rawResponse: payload as any,
      },
    });

    const lastEntry = await tx.ledger.findFirst({
      where:   { buyerId: order.buyerId },
      orderBy: { createdAt: 'desc' },
    });
    const newBalance = (lastEntry?.balance ?? 0) - order.total;

    await tx.ledger.create({
      data: {
        buyerId: order.buyerId,
        type:    'CREDIT',
        amount:  order.total,
        balance: newBalance,
        note:    `eSewa payment for ${order.orderNumber}`,
        orderId: order.id,
      },
    });

    await tx.profile.update({
      where: { id: order.buyerId },
      data:  { creditUsed: { decrement: order.total } },
    });
  });

  // Non-blocking email confirmation
  if (order.buyer.email) {
    void (async () => {
      const html = await render(PaymentConfirmEmail({
        orderNumber: order.orderNumber,
        storeName:   order.buyer.storeName ?? order.buyer.phone,
        amount:      order.total,
        method:      'eSewa',
        reference:   payload.transaction_uuid,
      }));
      void sendEmail(order.buyer.email!, `Payment Confirmed — ${order.orderNumber}`, html, 'payment_confirm');
    })();
  }

  res.status(200).json({ message: 'Payment recorded' });
});

// ─── POST /api/payments/webhook/khalti — Khalti server webhook ───────────────
router.post('/webhook/khalti', async (req: Request, res: Response): Promise<void> => {
  const { pidx } = req.body as { pidx?: string };

  if (!pidx) {
    res.status(400).json({ error: 'Missing pidx' });
    return;
  }

  // Verify with Khalti lookup API
  let khaltiData: Record<string, any>;
  try {
    const lookupRes = await axios.post(
      'https://a.khalti.com/api/v2/epayment/lookup/',
      { pidx },
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );
    khaltiData = lookupRes.data;
  } catch (err: any) {
    res.status(400).json({ error: 'Khalti lookup failed', detail: err?.response?.data });
    return;
  }

  if (khaltiData.status !== 'Completed') {
    res.status(200).json({ message: 'Payment not completed, ignored' });
    return;
  }

  const orderId = khaltiData.purchase_order_id as string;

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { buyer: { select: { phone: true, email: true, id: true, storeName: true } } },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Idempotency
  if (order.paymentStatus === 'PAID') {
    res.status(200).json({ message: 'Already processed' });
    return;
  }

  await withTransaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data:  { paymentStatus: 'PAID' },
    });

    await tx.payment.create({
      data: {
        orderId:     order.id,
        method:      'KHALTI',
        status:      'PAID',
        amount:      order.total,
        reference:   pidx,
        rawResponse: khaltiData as any,
      },
    });

    const lastEntry = await tx.ledger.findFirst({
      where:   { buyerId: order.buyerId },
      orderBy: { createdAt: 'desc' },
    });
    const newBalance = (lastEntry?.balance ?? 0) - order.total;

    await tx.ledger.create({
      data: {
        buyerId: order.buyerId,
        type:    'CREDIT',
        amount:  order.total,
        balance: newBalance,
        note:    `Khalti payment for ${order.orderNumber}`,
        orderId: order.id,
      },
    });

    await tx.profile.update({
      where: { id: order.buyerId },
      data:  { creditUsed: { decrement: order.total } },
    });
  });

  // Non-blocking email confirmation
  if (order.buyer.email) {
    void (async () => {
      const html = await render(PaymentConfirmEmail({
        orderNumber: order.orderNumber,
        storeName:   order.buyer.storeName ?? order.buyer.phone,
        amount:      order.total,
        method:      'Khalti',
        reference:   pidx,
      }));
      void sendEmail(order.buyer.email!, `Payment Confirmed — ${order.orderNumber}`, html, 'payment_confirm');
    })();
  }

  res.status(200).json({ message: 'Payment recorded' });
});

// ─── GET /api/payments/:orderId — ADMIN ──────────────────────────────────────
router.get('/:orderId', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const orderId = qs(req.params.orderId)!;
  const payments = await prisma.payment.findMany({
    where:   { orderId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ payments });
});

export default router;
