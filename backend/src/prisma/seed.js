const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PLANS = [
  { name: 'Free', description: 'Basic camera monitoring', price: 0, interval: 'MONTHLY', features: JSON.stringify(['1 camera', '1 day recording history', 'Pixel-diff detection', 'Email alerts']), stripePriceId: 'free_plan', sortOrder: 0, highlighted: false },
  { name: 'Pro', description: 'For serious home security', price: 999, interval: 'MONTHLY', features: JSON.stringify(['Up to 5 cameras', '30 day recording history', 'ML object detection', 'Two-way audio', 'Email + push alerts', 'Cloud recordings']), stripePriceId: 'price_pro_monthly', sortOrder: 1, highlighted: true },
  { name: 'Enterprise', description: 'For power users & small biz', price: 2999, interval: 'MONTHLY', features: JSON.stringify(['Unlimited cameras', '90 day recording history', 'ML object detection', 'Two-way audio', 'All alert types', 'Priority support', 'Custom integrations']), stripePriceId: 'price_enterprise_monthly', sortOrder: 2, highlighted: false },
];

async function seedPlans() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { stripePriceId: plan.stripePriceId },
      update: plan,
      create: plan,
    });
  }
}

async function main() {
  console.log('🌱 Seeding database...');
  await seedPlans();

  // Admin — only create if explicitly configured via env
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hkcamera.app';
  if (process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash: hash },
      create: { email: adminEmail, passwordHash: hash, name: 'Admin User', role: 'ADMIN' },
    });
    console.log(`✅ Admin  → ${adminEmail}`);
  } else {
    console.log(`⏭️  Skipping admin — set ADMIN_PASSWORD to create`);
  }

  // Demo — only create if SEED_DEMO=true and DEMO_PASSWORD is set
  if (process.env.SEED_DEMO === 'true' && process.env.DEMO_PASSWORD) {
    const demoEmail = process.env.DEMO_EMAIL || 'demo@hkcamera.app';
    const hash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
    const demo = await prisma.user.upsert({
      where: { email: demoEmail },
      update: { passwordHash: hash },
      create: { email: demoEmail, passwordHash: hash, name: 'Demo User', role: 'USER', isDemo: true },
    });
    await prisma.camera.createMany({
      skipDuplicates: true,
      data: [
        { id: 'cam-front-door', name: 'Front Door', description: 'Main entrance camera', userId: demo.id, motionDetect: true, sensitivity: 40 },
        { id: 'cam-backyard', name: 'Backyard', description: 'Rear garden camera', userId: demo.id, motionDetect: true, sensitivity: 30 },
      ],
    });
    console.log(`✅ Demo   → ${demoEmail}`);
  } else {
    console.log(`⏭️  Skipping demo — set SEED_DEMO=true and DEMO_PASSWORD to create`);
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
