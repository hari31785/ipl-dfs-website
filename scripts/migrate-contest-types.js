// Set database URL for local development
process.env.DATABASE_URL = "file:/Users/harikurada/Desktop/ipl-dfs-website/prisma/dev.db";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateContestTypes() {
  try {
    console.log('Starting contest type migration...');

    // Update 25_COIN to LOW_STAKES
    const updated25 = await prisma.contest.updateMany({
      where: { contestType: '25_COIN' },
      data: { contestType: 'LOW_STAKES' }
    });
    console.log(`Updated ${updated25.count} contests from 25_COIN to LOW_STAKES`);

    // Update 50_COIN to REGULAR
    const updated50 = await prisma.contest.updateMany({
      where: { contestType: '50_COIN' },
      data: { contestType: 'REGULAR' }
    });
    console.log(`Updated ${updated50.count} contests from 50_COIN to REGULAR`);

    // Update 100_COIN to HIGH_ROLLER
    const updated100 = await prisma.contest.updateMany({
      where: { contestType: '100_COIN' },
      data: { contestType: 'HIGH_ROLLER' }
    });
    console.log(`Updated ${updated100.count} contests from 100_COIN to HIGH_ROLLER`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateContestTypes();
