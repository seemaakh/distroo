import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ─── GET /api/announcements — active announcements within date range ──────────
router.get('/announcements', async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      active: true,
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ announcements });
});

// ─── GET /api/districts — delivery districts with fees ───────────────────────
router.get('/districts', async (req: Request, res: Response): Promise<void> => {
  const { active } = req.query as { active?: string };

  const where: Record<string, any> = {};
  if (active === 'true')  where.active = true;
  if (active === 'false') where.active = false;

  const districts = await prisma.district.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  res.json({ districts });
});

// ─── GET /api/categories — full category tree ─────────────────────────────────
router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({
    where:   { parentId: null },
    include: { children: true },
    orderBy: { name: 'asc' },
  });
  res.json({ categories });
});

export default router;
