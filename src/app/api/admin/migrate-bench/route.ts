import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log('Starting bench players migration...');

    // This migration adds the isBench and didNotPlay fields to the database
    // The fields are already in the schema, this just updates existing records
    
    // Set isBench=false for all existing draft picks (they were all starters in old system)
    const updatedPicks = await prisma.draftPick.updateMany({
      where: {
        isBench: null
      },
      data: {
        isBench: false
      }
    });
    
    console.log(`Updated ${updatedPicks.count} draft picks with isBench=false`);

    // Set didNotPlay=false for all existing player stats
    const updatedStats = await prisma.playerStat.updateMany({
      where: {
        didNotPlay: null
      },
      data: {
        didNotPlay: false
      }
    });
    
    console.log(`Updated ${updatedStats.count} player stats with didNotPlay=false`);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      updated: {
        draftPicks: updatedPicks.count,
        playerStats: updatedStats.count
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
