import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, isAdmin } from '../middleware/auth';

const router = Router();

/** Safely extract a scalar string from req.query. */
const qs = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;

// ─── GET /api/admin/email-logs — ADMIN ───────────────────────────────────────
router.get('/email-logs', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const type   = qs(req.query.type   as string | string[] | undefined);
  const status = qs(req.query.status as string | string[] | undefined);
  const page   = qs(req.query.page   as string | string[] | undefined);
  const limit  = qs(req.query.limit  as string | string[] | undefined);

  const pageNum  = Math.max(1, parseInt(page  ?? '1')  || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20') || 20));
  const skip     = (pageNum - 1) * limitNum;

  const where: Record<string, any> = {};
  if (type)   where.type   = type;
  if (status) where.status = status;

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true, to: true, subject: true, type: true,
        status: true, messageId: true, createdAt: true,
      },
    }),
    prisma.emailLog.count({ where }),
  ]);

  res.json({ logs, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

export default router;
