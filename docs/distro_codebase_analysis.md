# DISTRO — Codebase Analysis Report

> **Platform**: B2B Wholesale (Nepal) — Single wholesaler, shopkeeper buyers  
> **Slogan**: "Wholesale, made simple."  
> **Analysed**: 2026-04-04

---

## 1. Repository Layout

```
DISTRO/
├── distro-api/        ← Express.js REST API (port 3001, localhost-only)
├── distro-web/        ← Next.js 14 storefront + admin panel (port 3000)
├── distro-app/        ← React Native / Expo mobile app
├── nextjs-distro/     ← Legacy/experimental Next.js build (appears unused)
├── docs/              ← Documentation folder
├── CLAUDE.md          ← Master project spec (stack, tokens, rules)
└── *.html             ← Static HTML prototypes (distro, catalogue, faq)
```

> **NOTE:** `nextjs-distro/` is a second Next.js project that appears to be an older iteration. It is NOT actively used. Consider removing it.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Backend / API** | Express.js 5 + TypeScript, Prisma ORM, MySQL |
| **Authentication** | Custom JWT + bcryptjs, session table, OTP support |
| **Web Frontend** | Next.js 14 (App Router), TailwindCSS v3, Zustand, TanStack React Query |
| **Mobile** | React Native 0.81 + Expo 54, React Navigation, Zustand |
| **Payments** | eSewa, Khalti, Cash on Delivery |
| **SMS** | Sparrow SMS (Nepal) |
| **Email** | Resend + @react-email/components |
| **PDF** | PDFKit (IRD VAT invoices) |
| **Maps** | Google Maps API (`@vis.gl/react-google-maps`) |
| **Mobile Storage** | `expo-secure-store` (no AsyncStorage) |
| **Charts** | Recharts (web admin) |

---

## 3. Database Schema (Prisma + MySQL)

### Models Overview

| Model | Purpose |
|---|---|
| `Profile` | Unified user model (ADMIN + BUYER), includes OTP, lock-out, credit limit |
| `Session` | JWT session tokens (DB-backed, cascades on delete) |
| `Product` | SKU, price, MRP, MOQ, stock qty, image |
| `Category` | Hierarchical (self-referencing parent/child with emoji) |
| `Order` | Full order lifecycle with geo-delivery fields (lat/lng) |
| `OrderItem` | Snapshot of product name/price at order time |
| `Payment` | Multi-method per order (eSewa/Khalti/COD), raw JSON response stored |
| `Ledger` | Debit/credit ledger per buyer |
| `StockMovement` | IN / OUT / ADJUSTMENT audit trail |
| `PriceHistory` | Tracks price changes with reason |
| `District` | Delivery zones with fees and ETD |
| `Announcement` | Ticker bar announcements (date-gated) |
| `Setting` | Key-value store for app config |
| `EmailLog` | Sent email audit log |

### Enums
- **OrderStatus**: `PENDING → CONFIRMED → PROCESSING → DISPATCHED → DELIVERED | CANCELLED`
- **PayStatus**: `UNPAID | PAID | PARTIAL | REFUNDED`
- **PayMethod**: `ESEWA | KHALTI | COD`
- **LedgerType**: `DEBIT | CREDIT`
- **MoveType**: `IN | OUT | ADJUSTMENT`

---

## 4. Backend — `distro-api`

### Entry Point (`src/app.ts`)
- Express 5 with Helmet, CORS (origin-locked to `localhost:3000`), Morgan logging
- Rate limiter applied globally via `express-rate-limit`
- Static file serving for `/uploads`
- Binds **only** to `127.0.0.1` — never externally exposed ✅
- Cleanup cron started at launch

### API Routes

| Route | File | Scope |
|---|---|---|
| `GET /api/health` | `health.ts` | Public |
| `POST /api/auth/*` | `auth.ts` | OTP, login, register, refresh |
| `GET/POST /api/products` | `products.ts` | Admin CRUD + public browse |
| `GET/POST /api/orders` | `orders.ts` | Order lifecycle (~20KB — most complex) |
| `GET /api/customers` | `customers.ts` | Admin buyer management |
| `GET /api/ledger` | `ledger.ts` | Admin + buyer ledger |
| `GET /api/inventory` | `inventory.ts` | Admin stock management |
| `GET /api/payments` | `payments.ts` | eSewa/Khalti callbacks |
| `GET /api/reports` | `reports.ts` | Admin analytics |
| `GET /api/admin/*` | `admin.ts` | Dashboard stats |
| `GET /api/*` | `public.ts` | Announcements, districts, categories |

### Lib Utilities

| File | Purpose |
|---|---|
| `auth.ts` | JWT sign/verify, token helpers |
| `prisma.ts` | Singleton Prisma client |
| `transaction.ts` | `withTransaction()` wrapper (enforced for financial writes) |
| `email.ts` | Resend integration |
| `sms.ts` | Sparrow SMS integration |
| `notifications.ts` | WhatsApp → SMS fallback |
| `cleanup.ts` | Cron job (expired sessions, OTPs) |

---

## 5. Web Frontend — `distro-web`

### App Router Pages

```
src/app/
├── page.tsx              ← Homepage (hero, stats, categories, products, CTA)
├── layout.tsx            ← Root layout
├── globals.css           ← Global styles + Tailwind tokens
├── catalogue/            ← Product browsing with filters
├── product/              ← Product detail
├── cart/                 ← Cart review
├── checkout/             ← Checkout + map picker
├── order-confirm/        ← Post-order confirmation
├── track/                ← Order tracking (public)
├── coverage/             ← District coverage map
├── faq/                  ← FAQ page
├── login/                ← Buyer login
├── register/             ← Buyer registration
├── (buyer)/              ← Protected buyer dashboard (route group)
└── admin/                ← Protected admin panel
    ├── page.tsx           ← Dashboard (stats, recent orders, quick actions)
    ├── orders/
    ├── products/
    ├── customers/
    ├── inventory/
    ├── ledger/
    ├── payments/
    ├── pricing/
    ├── reports/
    ├── settings/
    └── announcements/
```

### Key Components

| Component | Purpose |
|---|---|
| `Navbar.tsx` | Main navigation, cart badge, auth state |
| `Footer.tsx` | Site footer |
| `TickerBar.tsx` | Scrolling announcement ticker |
| `ProductCard.tsx` | Product grid tile |
| `CartDrawer.tsx` | Slide-out cart panel |
| `OrderDetailModal.tsx` | Order details overlay |
| `MapLocationPicker.tsx` | Google Maps delivery pin drop |
| `Providers.tsx` | TanStack Query + auth context wrapper |

### State Management
- **Auth**: `authStore.ts` (Zustand) — JWT token, user profile
- **Cart**: `cartStore.ts` (Zustand) — items, quantities, totals
- **Server state**: TanStack React Query — all API fetches with stale-while-revalidate

---

## 6. Mobile App — `distro-app`

### Navigation Structure

```
RootNavigator
├── AuthStack (unauthenticated)
│   └── Login, Register screens
└── BuyerTabs (authenticated)
    ├── Home
    ├── Catalogue
    ├── Cart
    ├── Orders
    └── Account
    └── (AdminTabs — if ADMIN role)
```

### Screens

| Screen | Size | Notes |
|---|---|---|
| `HomeScreen.tsx` | 8.6 KB | Featured products, banners |
| `CatalogueScreen.tsx` | 9.6 KB | Product browse + filter |
| `ProductScreen.tsx` | 10.2 KB | Product detail, add-to-cart |
| `CartScreen.tsx` | 7.0 KB | Cart management |
| `CheckoutScreen.tsx` | 14.4 KB | Most complex — payments, address, delivery |
| `OrdersScreen.tsx` | 4.0 KB | Order history list |
| `OrderDetailScreen.tsx` | 9.8 KB | Order tracking detail |
| `OrderConfirmScreen.tsx` | 3.2 KB | Post-order success |
| `AccountScreen.tsx` | 12.4 KB | Profile, settings, logout |

---

## 7. Architecture Assessment

### ✅ Strengths

1. **Clear monorepo separation** — API, web, mobile cleanly isolated
2. **`127.0.0.1` binding** — API never externally exposed
3. **`withTransaction()` pattern** — Financial writes protected against partial failures
4. **Full audit trails** — `StockMovement`, `PriceHistory`, `OrderActivity`, `Ledger`, `EmailLog`
5. **DB-backed sessions** — Enables server-side JWT revocation
6. **Global rate limiting** — `express-rate-limit` on all routes
7. **Helmet + CORS** — Security headers enforced
8. **OTP + account lockout** — Schema fields present (`otpCode`, `loginAttempts`, `lockedUntil`)
9. **Multi-payment support** — eSewa, Khalti, COD with raw JSON response archival
10. **Nepal-localised stack** — Districts, Sparrow SMS, NP locale, IRD VAT PDF

### ⚠️ Issues & Recommendations

| Priority | Issue | Recommendation |
|---|---|---|
| 🔴 High | `nextjs-distro/` is a second full Next.js project — stale/unused | Delete or archive it |
| 🔴 High | Root-level `.html` files are old static prototypes | Move to `docs/` or delete |
| 🟡 Medium | `prisma/seed.js` AND `prisma/seed.ts` both exist | Delete `seed.js`, use `seed.ts` |
| 🟡 Medium | `orders.ts` is 20KB — doing too much | Refactor into route + service layers |
| 🟡 Medium | No test files found anywhere | Add Jest/Vitest unit tests for API routes |
| 🟡 Medium | Admin routes rely on client-side redirect only | Add server-side middleware protection |
| 🟠 Low | Root `package-lock.json` is 85 bytes (empty/broken) | Remove from root |
| 🟠 Low | Admin dashboard queries `/orders` not a dedicated admin endpoint | Create `/admin/recent-orders` |

---

## 8. Feature Completion Matrix

| Feature | Status |
|---|---|
| Buyer auth (login/register/OTP) | ✅ Complete |
| Product catalogue with categories | ✅ Complete |
| Cart & checkout (web + mobile) | ✅ Complete |
| eSewa / Khalti payment callbacks | ✅ Route present |
| Order lifecycle management | ✅ Complete |
| Stock management + audit trail | ✅ Complete |
| Customer ledger (credit system) | ✅ Complete |
| PDF invoice generation | ✅ PDFKit in deps |
| Email notifications | ✅ Resend wired |
| SMS notifications | ✅ Sparrow SMS wired |
| District delivery coverage map | ✅ Complete |
| Admin announcements | ✅ Complete |
| Admin reports / analytics | ✅ Recharts wired |
| Push notifications (mobile) | ✅ expo-notifications installed |
| Admin mobile screens | ⚠️ `AdminTabs.tsx` exists — depth unclear |
| End-to-end tests | ❌ None |
| CI/CD pipeline | ❌ Not found |
| Docker / deployment config | ❌ Not found |

---

## 9. Run Commands

```bash
# API (port 3001)
cd distro-api && npm run dev

# Web (port 3000)
cd distro-web && npm run dev

# Mobile
cd distro-app && npx expo start

# DB tools
cd distro-api && npm run db:migrate
cd distro-api && npm run db:seed
cd distro-api && npm run db:studio
```

**Dev Credentials**: Admin `9800000000 / admin123` | Buyer `9841100001 / distro123`
