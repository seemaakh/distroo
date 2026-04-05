import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, isAdmin } from '../middleware/auth';
import { withTransaction } from '../lib/transaction';

const router = Router();

/** Safely extract a scalar string from req.query or req.params (Express 5 types as string | string[]). */
const qs = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;

const LOW_STOCK_THRESHOLD = 10;

class InventoryError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}

// ─── GET /api/inventory — all products with stock info (ADMIN) ────────────────
router.get('/', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const inStock  = qs(req.query.inStock  as string | string[] | undefined);
  const lowStock = qs(req.query.lowStock as string | string[] | undefined);

  const where: Record<string, any> = {};
  if (inStock  === 'true')  where.stockQty = { gt: 0 };
  if (lowStock === 'true')  where.stockQty = { lte: LOW_STOCK_THRESHOLD };

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, brand: true, sku: true, unit: true,
      stockQty: true, moq: true, active: true,
      category: { select: { id: true, name: true } },
    },
  });

  const inventory = products.map((p) => ({
    ...p,
    lowStock: p.stockQty <= LOW_STOCK_THRESHOLD,
  }));

  res.json({ inventory });
});

// ─── POST /api/inventory/adjust — atomic stock adjustment (ADMIN) ─────────────
router.post(
  '/adjust',
  requireAuth,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { productId, type, qty, reason } = req.body as {
      productId?: string; type?: string; qty?: number; reason?: string;
    };

    if (!productId) {
      res.status(400).json({ error: 'productId is required' });
      return;
    }
    if (!type || !['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      res.status(400).json({ error: 'type must be IN, OUT, or ADJUSTMENT' });
      return;
    }
    if (qty == null || typeof qty !== 'number' || qty === 0) {
      res.status(400).json({ error: 'qty must be a non-zero number' });
      return;
    }
    if ((type === 'IN' || type === 'OUT') && qty < 0) {
      res.status(400).json({ error: 'qty must be positive for IN/OUT movements' });
      return;
    }

    let result: any;
    try {
      result = await withTransaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new InventoryError(404, 'Product not found');

        let newQty: number;
        if (type === 'IN') {
          newQty = product.stockQty + qty;
        } else if (type === 'OUT') {
          if (product.stockQty < qty) {
            throw new InventoryError(
              400,
              `Insufficient stock. Available: ${product.stockQty}, requested: ${qty}`,
            );
          }
          newQty = product.stockQty - qty;
        } else {
          // ADJUSTMENT — qty is a delta (positive adds, negative removes)
          newQty = product.stockQty + qty;
          if (newQty < 0) {
            throw new InventoryError(400, 'Adjustment would result in negative stock');
          }
        }

        const [movement, updated] = await Promise.all([
          tx.stockMovement.create({
            data: { productId, type: type as any, qty, reason: reason ?? null },
          }),
          tx.product.update({
            where: { id: productId },
            data:  { stockQty: newQty },
          }),
        ]);

        return { movement, product: updated };
      });
    } catch (err) {
      if (err instanceof InventoryError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }

    res.status(201).json(result);
  },
);

// ─── GET /api/inventory/movements — paginated movement log (ADMIN) ────────────
router.get(
  '/movements',
  requireAuth,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const productId = qs(req.query.productId as string | string[] | undefined);
    const page      = qs(req.query.page      as string | string[] | undefined);
    const limit     = qs(req.query.limit     as string | string[] | undefined);

    const pageNum  = Math.max(1, parseInt(page  ?? '1')  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20') || 20));
    const skip     = (pageNum - 1) * limitNum;

    const where: Record<string, any> = {};
    if (productId) where.productId = productId;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({ movements, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  },
);

export default router;
