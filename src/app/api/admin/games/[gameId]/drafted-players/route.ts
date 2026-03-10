import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;

    // Get all contests for this game
    const contests = await prisma.contest.findMany({
      where: {
        iplGameId: gameId
      },
      select: {
        id: true
      }
    });

    if (contests.length === 0) {
      return NextResponse.json({ playerIds: [] });
    }

    const contestIds = contests.map(c => c.id);

    // Get all matchups for these contests
    const matchups = await prisma.headToHeadMatchup.findMany({
      where: {
        contestId: {
          in: contestIds
        }
      },
      select: {
        id: true
      }
    });

    if (matchups.length === 0) {
      return NextResponse.json({ playerIds: [] });
    }

    const matchupIds = matchups.map(m => m.id);

    // Get all unique player IDs from draft picks
    const draftPicks = await prisma.draftPick.findMany({
      where: {
        matchupId: {
          in: matchupIds
        }
      },
      select: {
        playerId: true
      },
      distinct: ['playerId']
    });

    const playerIds = draftPicks.map(pick => pick.playerId);

    return NextResponse.json({ 
      playerIds,
      count: playerIds.length
    });

  } catch (error) {
    console.error('Error fetching drafted players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafted players' },
      { status: 500 }
    );
  }
}
