import { prisma } from './prisma';

export async function cleanExpiredSessions(): Promise<void> {
  const deleted = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (deleted.count > 0) {
    console.log(`[CLEANUP] Removed ${deleted.count} expired sessions`);
  }
}

export function startCleanupCron(): void {
  // Run once on boot, then every 24 hours
  cleanExpiredSessions().catch((e) =>
    console.warn('[CLEANUP] Skipped — DB not ready:', e.message)
  );
  setInterval(
    () =>
      cleanExpiredSessions().catch((e) =>
        console.warn('[CLEANUP] Failed:', e.message)
      ),
    24 * 60 * 60 * 1000
  );
}
