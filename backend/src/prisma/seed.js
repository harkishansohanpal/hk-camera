const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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
