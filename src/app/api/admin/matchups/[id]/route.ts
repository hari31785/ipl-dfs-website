import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/matchups/[id] - Delete a matchup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the matchup with draft picks
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id },
      include: {
        draftPicks: true,
        _count: {
          select: {
            draftPicks: true
          }
        }
      }
    });

    if (!matchup) {
      return NextResponse.json(
        { message: 'Matchup not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion of completed matchups
    if (matchup.status === 'COMPLETED') {
      return NextResponse.json(
        { message: 'Cannot delete completed matchup. Draft has finished.' },
        { status: 400 }
      );
    }

    // Delete all draft picks first (if any)
    if (matchup._count.draftPicks > 0) {
      await prisma.draftPick.deleteMany({
        where: { matchupId: id }
      });
      console.log(`🗑️ Deleted ${matchup._count.draftPicks} draft picks for matchup ${id}`);
    }

    // Delete the matchup
    await prisma.headToHeadMatchup.delete({
      where: { id }
    });

    console.log(`✅ Successfully deleted matchup ${id}`);

    return NextResponse.json({
      message: 'Matchup deleted successfully',
      draftPicksDeleted: matchup._count.draftPicks
    });

  } catch (error) {
    console.error('Error deleting matchup:', error);
    return NextResponse.json(
      { message: 'Failed to delete matchup' },
      { status: 500 }
    );
  }
}
