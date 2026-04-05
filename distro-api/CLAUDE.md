# distro-api context
Entry: src/app.ts | Schema: prisma/schema.prisma | Routes: src/routes/

## Key patterns
- All order/payment/stock mutations use withTransaction()
- Notifications are fire-and-forget: void sendNotification(...) — never await in route handler
- Payment webhooks must be idempotent — check existing status before processing
- Passwords: bcrypt rounds=12 | JWT: 30d expiry stored in Sessions table

## Commands
npm run dev | npm run build | npm run db:migrate | npm run db:seed | npm run db:studio

@./docs/api-architecture.md
