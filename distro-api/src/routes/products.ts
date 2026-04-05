import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { requireAuth, isAdmin } from '../middleware/auth';
import { withTransaction } from '../lib/transaction';

const router = Router();

/** Safely extract a scalar string from req.query or req.params (Express 5 types as string | string[]). */
const qs = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;

// ─── Multer setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, png, webp images are allowed'));
    }
  },
});

// ─── GET /api/products — public ───────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const categoryId = qs(req.query.categoryId as string | string[] | undefined);
  const brand      = qs(req.query.brand      as string | string[] | undefined);
  const search     = qs(req.query.search     as string | string[] | undefined);
  const minPrice   = qs(req.query.minPrice   as string | string[] | undefined);
  const maxPrice   = qs(req.query.maxPrice   as string | string[] | undefined);
  const inStock    = qs(req.query.inStock    as string | string[] | undefined);
  const sort       = qs(req.query.sort       as string | string[] | undefined);
  const page       = qs(req.query.page       as string | string[] | undefined);
  const limit      = qs(req.query.limit      as string | string[] | undefined);

  const pageNum  = Math.max(1, parseInt(page  ?? '1')  || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20') || 20));
  const skip     = (pageNum - 1) * limitNum;

  const where: Record<string, any> = { active: true };
  if (categoryId)         where.categoryId = categoryId;
  if (brand)              where.brand = { contains: brand };
  if (inStock === 'true') where.stockQty = { gt: 0 };
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { name:  { contains: search } },
      { brand: { contains: search } },
    ];
  }

  let orderBy: Record<string, string> = { createdAt: 'desc' };
  if      (sort === 'price_asc')  orderBy = { price: 'asc' };
  else if (sort === 'price_desc') orderBy = { price: 'desc' };
  else if (sort === 'name_asc')   orderBy = { name: 'asc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      select: {
        id: true, name: true, brand: true, price: true, mrp: true,
        unit: true, moq: true, stockQty: true, imageUrl: true, active: true,
        category: { select: { id: true, name: true, emoji: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// ─── POST /api/products/bulk-price — ADMIN ────────────────────────────────────
router.post(
  '/bulk-price',
  requireAuth,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { updates } = req.body as {
      updates?: Array<{ id: string; newPrice: number; reason?: string }>;
    };
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: 'updates array is required' });
      return;
    }

    await withTransaction(async (tx) => {
      for (const u of updates) {
        const product = await tx.product.findUnique({ where: { id: u.id } });
        if (!product) throw new Error(`Product ${u.id} not found`);
        await tx.priceHistory.create({
          data: {
            productId: u.id,
            oldPrice:  product.price,
            newPrice:  u.newPrice,
            reason:    u.reason ?? null,
          },
        });
        await tx.product.update({ where: { id: u.id }, data: { price: u.newPrice } });
      }
    });

    res.json({ message: `${updates.length} price(s) updated` });
  },
);

// ─── POST /api/products/upload-image — ADMIN ──────────────────────────────────
router.post(
  '/upload-image',
  requireAuth,
  isAdmin,
  (_req: Request, _res: Response, next: NextFunction) => {
    upload.single('image')(_req, _res, (err: any) => {
      if (err instanceof multer.MulterError) {
        _res.status(400).json({
          error: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 2 MB limit' : err.message,
        });
        return;
      }
      if (err) {
        _res.status(400).json({ error: err.message ?? 'Upload failed' });
        return;
      }
      next();
    });
  },
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  },
);

// ─── GET /api/products/price-history/:id — ADMIN ─────────────────────────────
router.get(
  '/price-history/:id',
  requireAuth,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = qs(req.params.id)!;
    const history = await prisma.priceHistory.findMany({
      where:   { productId: id },
      orderBy: { changedAt: 'desc' },
    });
    res.json({ history });
  },
);

// ─── POST /api/products — create, ADMIN ──────────────────────────────────────
router.post('/', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const {
    name, brand, description, sku, categoryId,
    price, mrp, unit, moq, stockQty, imageUrl, active,
  } = req.body as {
    name?: string; brand?: string; description?: string; sku?: string;
    categoryId?: string; price?: number; mrp?: number; unit?: string;
    moq?: number; stockQty?: number; imageUrl?: string; active?: boolean;
  };

  if (!name || price == null) {
    res.status(400).json({ error: 'name and price are required' });
    return;
  }

  const product = await prisma.product.create({
    data: {
      name,
      brand:       brand       ?? null,
      description: description ?? null,
      sku:         sku         ?? null,
      categoryId:  categoryId  ?? null,
      price,
      mrp:      mrp      ?? null,
      unit:     unit     ?? 'piece',
      moq:      moq      ?? 1,
      stockQty: stockQty ?? 0,
      imageUrl: imageUrl ?? null,
      active:   active   ?? true,
    },
  });
  res.status(201).json({ product });
});

// ─── PUT /api/products/:id — update, ADMIN ───────────────────────────────────
router.put('/:id', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = qs(req.params.id)!;
  const { name, price, mrp, moq, stockQty, active, description, imageUrl } = req.body as {
    name?: string; price?: number; mrp?: number; moq?: number;
    stockQty?: number; active?: boolean; description?: string; imageUrl?: string;
  };

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name }),
      ...(price       !== undefined && { price }),
      ...(mrp         !== undefined && { mrp }),
      ...(moq         !== undefined && { moq }),
      ...(stockQty    !== undefined && { stockQty }),
      ...(active      !== undefined && { active }),
      ...(description !== undefined && { description }),
      ...(imageUrl    !== undefined && { imageUrl }),
    },
  });
  res.json({ product });
});

export default router;
