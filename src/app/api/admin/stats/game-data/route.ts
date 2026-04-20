import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/stats/game-data?gameId=
// Combined endpoint: returns stats + drafted player IDs + players for a game in one round-trip.
// Replaces 3 separate fetches on the bulk stats page (/api/admin/stats, /api/admin/games/[id]/drafted-players, /api/admin/players).
export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get('gameId');
    if (!gameId) {
      return NextResponse.json({ message: 'gameId is required' }, { status: 400 });
    }

    // Fetch game (need team IDs + tournamentId to filter players)
    const game = await prisma.iPLGame.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        tournamentId: true,
        team1Id: true,
        team2Id: true,
      },
    });

    if (!game) {
      return NextResponse.json({ message: 'Game not found' }, { status: 404 });
    }

    // All three in parallel
    const [stats, players, draftPickPlayerIds] = await Promise.all([
      // 1. Existing stats for this game
      prisma.playerStat.findMany({
        where: { iplGameId: gameId },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              role: true,
              iplTeam: {
                select: { id: true, name: true, shortName: true, color: true },
              },
            },
          },
        },
        orderBy: { points: 'desc' },
      }),

      // 2. All players for both teams in this game
      prisma.player.findMany({
        where: {
          tournamentId: game.tournamentId,
          iplTeamId: { in: [game.team1Id, game.team2Id] },
        },
        select: {
          id: true,
          name: true,
          role: true,
          iplTeam: {
            select: { id: true, name: true, shortName: true, color: true },
          },
        },
        orderBy: { name: 'asc' },
      }),

      // 3. Unique player IDs that have been drafted in this game's matchups
      prisma.draftPick.findMany({
        where: {
          matchup: {
            contest: { iplGameId: gameId },
          },
        },
        select: { playerId: true },
        distinct: ['playerId'],
      }),
    ]);

    return NextResponse.json({
      stats,
      players,
      draftedPlayerIds: draftPickPlayerIds.map((p) => p.playerId),
    });
  } catch (error) {
    console.error('Error fetching game data:', error);
    return NextResponse.json({ message: 'Failed to fetch game data' }, { status: 500 });
  }
}
