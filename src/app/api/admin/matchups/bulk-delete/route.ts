import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/admin/matchups/bulk-delete - Delete multiple matchups
export async function POST(request: NextRequest) {
  try {
    const { matchupIds } = await request.json();

    if (!Array.isArray(matchupIds) || matchupIds.length === 0) {
      return NextResponse.json(
        { message: 'No matchup IDs provided' },
        { status: 400 }
      );
    }

    // Fetch all requested matchups
    const matchups = await prisma.headToHeadMatchup.findMany({
      where: { id: { in: matchupIds } },
      include: {
        _count: { select: { draftPicks: true } }
      }
    });

    const completedMatchups = matchups.filter(m => m.status === 'COMPLETED');
    if (completedMatchups.length > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete ${completedMatchups.length} completed matchup(s). Only non-completed matchups can be deleted.`,
          completedIds: completedMatchups.map(m => m.id)
        },
        { status: 400 }
      );
    }

    const eligibleIds = matchups.map(m => m.id);
    const totalDraftPicks = matchups.reduce((sum, m) => sum + m._count.draftPicks, 0);

    // Delete draft picks first
    if (totalDraftPicks > 0) {
      await prisma.draftPick.deleteMany({
        where: { matchupId: { in: eligibleIds } }
      });
    }

    // Delete matchups
    const { count } = await prisma.headToHeadMatchup.deleteMany({
      where: { id: { in: eligibleIds } }
    });

    console.log(`✅ Bulk deleted ${count} matchups and ${totalDraftPicks} draft picks`);

    return NextResponse.json({
      message: `Successfully deleted ${count} matchup(s)`,
      deletedCount: count,
      draftPicksDeleted: totalDraftPicks
    });

  } catch (error) {
    console.error('Error bulk deleting matchups:', error);
    return NextResponse.json(
      { message: 'Failed to bulk delete matchups' },
      { status: 500 }
    );
  }
}
