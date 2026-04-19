import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache for the full lifetime of a draft window.
// Stats for a game's players never change while drafting is in progress —
// the IPL match hasn't started yet. One DB hit serves all users drafting
// for the same game.
export const revalidate = 3600; // 1 hour

/**
 * GET /api/draft/stats/[iplGameId]
 *
 * Returns a map of { [playerId]: { points, runs, wickets, catches } }
 * for all players who have stats recorded for this game.
 *
 * Cached at the edge — all concurrent draft sessions for the same game
 * share a single DB query result.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ iplGameId: string }> }
) {
  try {
    const { iplGameId } = await params;

    const stats = await prisma.playerStat.findMany({
      where: { iplGameId },
      select: {
        playerId: true,
        points: true,
        runs: true,
        wickets: true,
        catches: true,
        didNotPlay: true,
        runOuts: true,
        stumpings: true,
      },
    });

    // Key by playerId for O(1) client-side lookup
    const statsMap: Record<string, { points: number; runs: number; wickets: number; catches: number; didNotPlay: boolean; runOuts: number; stumpings: number }> = {};
    for (const s of stats) {
      statsMap[s.playerId] = {
        points: s.points,
        runs: s.runs,
        wickets: s.wickets,
        catches: s.catches,
        didNotPlay: s.didNotPlay,
        runOuts: s.runOuts,
        stumpings: s.stumpings,
      };
    }

    return NextResponse.json(statsMap);
  } catch (error) {
    console.error('Error fetching draft stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch draft stats' },
      { status: 500 }
    );
  }
}
