/**
 * purge-old-recordings.js
 * ─────────────────────────────────────────────────────────────
 * Cron job: deletes recordings that exceed each camera's
 * retentionDays setting.
 *
 * Usage:  node scripts/purge-old-recordings.js
 * Cron:   0 3 * * * cd /app && node scripts/purge-old-recordings.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const cameras = await prisma.camera.findMany({
    where: { retentionDays: { gt: 0 } },
    select: { id: true, retentionDays: true },
  });

  let totalDeleted = 0;

  for (const cam of cameras) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cam.retentionDays);

    const { count } = await prisma.recording.deleteMany({
      where: { cameraId: cam.id, createdAt: { lt: cutoff } },
    });

    if (count > 0) {
      console.log(`[Purge] Camera ${cam.id}: deleted ${count} recordings older than ${cam.retentionDays} days`);
      totalDeleted += count;
    }
  }

  console.log(`[Purge] Complete: ${totalDeleted} total recordings purged`);
}

main()
  .catch((err) => { console.error('[Purge] Failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
