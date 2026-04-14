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

    // Fetch all requested matchups (include signup IDs for cleanup)
    const matchups = await prisma.headToHeadMatchup.findMany({
      where: { id: { in: matchupIds } },
      include: {
        _count: { select: { draftPicks: true } }
      }
    });
    // Collect the specific ContestSignup IDs referenced by these matchups
    const signupIdsToDelete = matchups.flatMap(m => [m.user1Id, m.user2Id]);

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

    // Run all deletes atomically
    const { count, signupsRemoved } = await prisma.$transaction(async (tx) => {
      // 1. Delete draft picks
      if (totalDraftPicks > 0) {
        await tx.draftPick.deleteMany({ where: { matchupId: { in: eligibleIds } } });
      }
      // 2. Delete matchups
      const { count } = await tx.headToHeadMatchup.deleteMany({ where: { id: { in: eligibleIds } } });
      // 3. Delete the specific ContestSignup records so users don't see ghost entries
      const { count: signupsRemoved } = await tx.contestSignup.deleteMany({
        where: { id: { in: signupIdsToDelete } },
      });
      return { count, signupsRemoved };
    });

    console.log(`✅ Bulk deleted ${count} matchups, ${totalDraftPicks} draft picks, ${signupsRemoved} signups`);

    return NextResponse.json({
      message: `Successfully deleted ${count} matchup(s)`,
      deletedCount: count,
      draftPicksDeleted: totalDraftPicks,
      signupsRemoved,
    });

  } catch (error) {
    console.error('Error bulk deleting matchups:', error);
    return NextResponse.json(
      { message: 'Failed to bulk delete matchups' },
      { status: 500 }
    );
  }
}
