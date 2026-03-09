import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
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

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      updated: {
        lowStakes: updated25.count,
        regular: updated50.count,
        highRoller: updated100.count
      }
    });
  } catch (error) {
    console.error('Error during migration:', error);
    return NextResponse.json(
      { success: false, message: 'Migration failed', error: String(error) },
      { status: 500 }
    );
  }
}
