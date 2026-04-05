import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, isAdmin } from '../middleware/auth';

const router = Router();

/** Safely extract a scalar string from req.query. */
const qs = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;

function escapeXml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

function toTallyDate(d: Date): string {
  // Tally date format: YYYYMMDD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// ─── GET /api/reports/summary — ADMIN ────────────────────────────────────────
router.get('/summary', requireAuth, isAdmin, async (_req: Request, res: Response): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    todayOrderCount,
    todayRevenueAgg,
    pendingOrderCount,
    lowStockCount,
    totalBuyersCount,
  ] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.order.aggregate({
      where:  {
        createdAt: { gte: todayStart, lte: todayEnd },
        status:    { not: 'CANCELLED' },
      },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { stockQty: { lte: 10 }, active: true } }),
    prisma.profile.count({ where: { role: 'BUYER', status: 'ACTIVE' } }),
  ]);

  res.json({
    todayOrders:   todayOrderCount,
    todayRevenue:  todayRevenueAgg._sum.total ?? 0,
    pendingOrders: pendingOrderCount,
    lowStockItems: lowStockCount,
    totalBuyers:   totalBuyersCount,
  });
});

// ─── GET /api/reports/tally-export — ADMIN ───────────────────────────────────
router.get('/tally-export', requireAuth, isAdmin, async (req: Request, res: Response): Promise<void> => {
  const from = qs(req.query.from as string | string[] | undefined);
  const to   = qs(req.query.to   as string | string[] | undefined);

  const where: Record<string, any> = { status: { not: 'CANCELLED' } };
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59') } : {}),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: { buyer: { select: { storeName: true } } },
  });

  const vouchers = orders.map((order) => {
    const partyName = escapeXml(order.buyer.storeName ?? 'Cash');
    const narration = escapeXml(`Order ${order.orderNumber}`);
    const amount    = order.total.toFixed(2);
    const date      = toTallyDate(order.createdAt);

    return `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <NARRATION>${narration}</NARRATION>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(order.orderNumber)}</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>`;
  }).join('\n');

  const dateLabel = from && to ? `${from}-to-${to}` : new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>##SVCURRENTCOMPANY</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename="tally-export-${dateLabel}.xml"`);
  res.send(xml);
});

export default router;
