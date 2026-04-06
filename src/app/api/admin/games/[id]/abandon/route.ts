import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/admin/games/[id]/abandon
// Marks the IPL game as CANCELLED, all its contests as COMPLETED,
// and all matchups in those contests as CANCELLED.
// No coin transactions are needed since coins are only moved at contest settlement.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    const game = await prisma.iPLGame.findUnique({
      where: { id: gameId },
      include: {
        contests: {
          include: {
            _count: { select: { matchups: true, signups: true } }
          }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ message: 'Game not found' }, { status: 404 });
    }

    if (game.status === 'CANCELLED') {
      return NextResponse.json({ message: 'Game is already cancelled' }, { status: 400 });
    }

    const contestIds = game.contests.map(c => c.id);

    // Single transaction: cancel game, complete contests, cancel matchups
    await prisma.$transaction(async (tx) => {
      // 1. Mark game as CANCELLED
      await tx.iPLGame.update({
        where: { id: gameId },
        data: { status: 'CANCELLED' }
      });

      // 2. Mark all contests for this game as COMPLETED
      if (contestIds.length > 0) {
        await tx.contest.updateMany({
          where: { iplGameId: gameId },
          data: { status: 'COMPLETED' }
        });

        // 3. Mark all matchups in those contests as CANCELLED
        await tx.headToHeadMatchup.updateMany({
          where: { contestId: { in: contestIds } },
          data: { status: 'CANCELLED' }
        });
      }
    });

    const totalSignups = game.contests.reduce((sum, c) => sum + c._count.signups, 0);
    const totalMatchups = game.contests.reduce((sum, c) => sum + c._count.matchups, 0);

    console.log(`✅ Game ${game.title} abandoned: ${game.contests.length} contests completed, ${totalMatchups} matchups cancelled`);

    return NextResponse.json({
      message: `Game "${game.title}" has been abandoned. ${game.contests.length} contest(s) marked as completed, ${totalMatchups} matchup(s) cancelled. ${totalSignups} signup(s) affected (no coins deducted).`,
      gameId,
      contestsCompleted: game.contests.length,
      matchupsCancelled: totalMatchups,
      signupsAffected: totalSignups
    });

  } catch (error) {
    console.error('Error abandoning game:', error);
    return NextResponse.json(
      { message: 'Failed to abandon game', error: String(error) },
      { status: 500 }
    );
  }
}
