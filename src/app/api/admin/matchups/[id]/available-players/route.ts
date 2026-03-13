import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;

    // Get the matchup with contest and game info
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true
              }
            }
          }
        },
        draftPicks: {
          include: {
            player: true
          }
        }
      }
    });

    if (!matchup) {
      return NextResponse.json(
        { error: 'Matchup not found' },
        { status: 404 }
      );
    }

    const team1Id = matchup.contest.iplGame.team1.id;
    const team2Id = matchup.contest.iplGame.team2.id;

    // Get all players from both teams
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { iplTeamId: team1Id },
          { iplTeamId: team2Id }
        ]
      },
      include: {
        iplTeam: true
      },
      orderBy: [
        { iplTeam: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Filter out already picked players
    const pickedPlayerIds = new Set(matchup.draftPicks.map(pick => pick.playerId));
    const availablePlayers = players.filter(player => !pickedPlayerIds.has(player.id));

    return NextResponse.json({
      success: true,
      players: availablePlayers,
      pickedCount: pickedPlayerIds.size,
      totalCount: players.length
    });

  } catch (error) {
    console.error('Error fetching available players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
