import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/matchups/[id]/picks/[pickId]
// Only allows deleting the most recently added pick (highest pickOrder).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pickId: string }> }
) {
  try {
    const { id: matchupId, pickId } = await params;

    // Get matchup with all picks
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        draftPicks: { orderBy: { pickOrder: 'asc' } },
      },
    });

    if (!matchup) {
      return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });
    }

    if (matchup.draftPicks.length === 0) {
      return NextResponse.json({ error: 'No picks to delete' }, { status: 400 });
    }

    // Only allow deleting the last pick to keep pick order integrity
    const lastPick = matchup.draftPicks[matchup.draftPicks.length - 1];
    if (lastPick.id !== pickId) {
      return NextResponse.json(
        { error: 'Only the most recently added pick can be deleted' },
        { status: 400 }
      );
    }

    // Delete the pick
    await prisma.draftPick.delete({ where: { id: pickId } });

    // Revert matchup status if it was marked COMPLETED
    if (matchup.status === 'COMPLETED') {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { status: 'DRAFTING' },
      });
    }

    return NextResponse.json({ success: true, message: 'Pick deleted successfully' });
  } catch (error) {
    console.error('Error deleting pick:', error);
    return NextResponse.json(
      { error: 'Failed to delete pick', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
