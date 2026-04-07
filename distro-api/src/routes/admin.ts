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

// ─── Announcements CRUD ───────────────────────────────────────────────────────
router.get('/announcements', requireAuth, isAdmin, async (_req: Request, res: Response): Promise<void> => {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ announcements });
});

router.post('/announcements', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const { text, active = true } = req.body;
  if (!text?.trim()) { res.status(400).json({ error: 'text is required' }); return; }
  const announcement = await prisma.announcement.create({ data: { text: text.trim(), active } });
  res.status(201).json({ announcement });
});

router.patch('/announcements/:id', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const { text, active } = req.body;
  const data: Record<string, any> = {};
  if (text !== undefined) data.text = text.trim();
  if (active !== undefined) data.active = active;
  const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data });
  res.json({ announcement });
});

router.delete('/announcements/:id', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
