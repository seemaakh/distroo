import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, isAdmin } from '../middleware/auth';
import { withTransaction } from '../lib/transaction';

const router = Router();

/** Safely extract a scalar string from req.query or req.params (Express 5 types as string | string[]). */
const qs = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;

// ─── GET /api/ledger — paginated, date range + buyerId filter (ADMIN) ─────────
router.get('/', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const buyerId = qs(req.query.buyerId as string | string[] | undefined);
  const from    = qs(req.query.from    as string | string[] | undefined);
  const to      = qs(req.query.to      as string | string[] | undefined);
  const page    = qs(req.query.page    as string | string[] | undefined);
  const limit   = qs(req.query.limit   as string | string[] | undefined);

  const pageNum  = Math.max(1, parseInt(page  ?? '1')  || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20') || 20));
  const skip     = (pageNum - 1) * limitNum;

  const where: Record<string, any> = {};
  if (buyerId) where.buyerId = buyerId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }

  const [entries, total] = await Promise.all([
    prisma.ledger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        buyer: { select: { id: true, storeName: true, phone: true } },
      },
    }),
    prisma.ledger.count({ where }),
  ]);

  res.json({ entries, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// ─── POST /api/ledger — manual entry (ADMIN) ─────────────────────────────────
router.post('/', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const { type, amount, note, buyerId } = req.body as {
    type?: string; amount?: number; note?: string; buyerId?: string;
  };

  if (!type || !['CREDIT', 'DEBIT'].includes(type)) {
    res.status(400).json({ error: 'type must be CREDIT or DEBIT' });
    return;
  }
  if (amount == null || typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'amount must be a positive number' });
    return;
  }
  if (!buyerId) {
    res.status(400).json({ error: 'buyerId is required' });
    return;
  }

  let entry: any;
  try {
    entry = await withTransaction(async (tx) => {
      const buyer = await tx.profile.findUnique({ where: { id: buyerId }, select: { id: true } });
      if (!buyer) throw new Error('BUYER_NOT_FOUND');

      const lastEntry = await tx.ledger.findFirst({
        where:   { buyerId },
        orderBy: { createdAt: 'desc' },
      });

      const currentBalance = lastEntry?.balance ?? 0;
      const newBalance     = type === 'DEBIT' ? currentBalance + amount : currentBalance - amount;

      return tx.ledger.create({
        data: {
          buyerId,
          type:    type as any,
          amount,
          balance: newBalance,
          note:    note ?? null,
        },
      });
    });
  } catch (err: any) {
    if (err.message === 'BUYER_NOT_FOUND') {
      res.status(404).json({ error: 'Buyer not found' });
      return;
    }
    throw err;
  }

  res.status(201).json({ entry });
});

export default router;
