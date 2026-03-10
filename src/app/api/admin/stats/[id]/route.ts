import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/admin/stats/[id] - Update player stats
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { runs, wickets, catches, runOuts, stumpings, didNotPlay } = await request.json();

    // Validate inputs
    if (runs < 0 || wickets < 0 || catches < 0 || runOuts < 0 || stumpings < 0) {
      return NextResponse.json(
        { message: 'All stat values must be non-negative' },
        { status: 400 }
      );
    }

    // Calculate points
    const points = (runs * 1) + (wickets * 20) + ((catches + runOuts + stumpings) * 5);

    const updatedStats = await prisma.playerStat.update({
      where: { id },
      data: {
        runs,
        wickets,
        catches,
        runOuts,
        stumpings,
        didNotPlay: didNotPlay || false,
        points
      },
      include: {
        player: {
          include: {
            iplTeam: true
          }
        }
      }
    });

    return NextResponse.json(updatedStats);
  } catch (error) {
    console.error('Error updating stats:', error);
    return NextResponse.json(
      { message: 'Failed to update stats' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/admin/stats/[id] - Delete player stats
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.playerStat.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Stats deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting stats:', error);
    return NextResponse.json(
      { message: 'Failed to delete stats' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
