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
  console.log('✅ Plans seeded');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Plans are seeded in all environments (needed for pricing page)
  await seedPlans();

  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Skipping demo accounts — not created in production.');
    return;
  }

  // Admin user
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hkcamera.app' },
    update: {},
    create: {
      email: 'admin@hkcamera.app',
      passwordHash: adminHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Demo user
  const demoHash = await bcrypt.hash('Demo123!', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@hkcamera.app' },
    update: {},
    create: {
      email: 'demo@hkcamera.app',
      passwordHash: demoHash,
      name: 'Demo User',
      role: 'USER',
    },
  });

  // Demo cameras
  await prisma.camera.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'cam-front-door',
        name: 'Front Door',
        description: 'Main entrance camera',
        userId: demo.id,
        motionDetect: true,
        sensitivity: 40,
      },
      {
        id: 'cam-backyard',
        name: 'Backyard',
        description: 'Rear garden camera',
        userId: demo.id,
        motionDetect: true,
        sensitivity: 30,
      },
    ],
  });

  console.log('✅ Seed complete');
  console.log(`   Admin → admin@hkcamera.app / Admin123!`);
  console.log(`   Demo  → demo@hkcamera.app  / Demo123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
