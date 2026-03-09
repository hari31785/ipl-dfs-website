import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/draft/[matchupId] - Get matchup details and available players
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;
    
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        },
        user2: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        },
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
            player: {
              include: {
                iplTeam: true,
                stats: true
              }
            }
          },
          orderBy: {
            pickOrder: 'asc'
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

    // Filter stats to only include the current game
    const gameId = matchup.contest.iplGame.id;
    const matchupWithFilteredStats = {
      ...matchup,
      draftPicks: matchup.draftPicks.map(pick => ({
        ...pick,
        player: {
          ...pick.player,
          stats: pick.player.stats.filter(stat => stat.iplGameId === gameId)
        }
      }))
    };

    // Get all players from both teams
    const team1Id = matchup.contest.iplGame.team1Id;
    const team2Id = matchup.contest.iplGame.team2Id;
    
    const allPlayers = await prisma.player.findMany({
      where: {
        iplTeamId: {
          in: [team1Id, team2Id]
        },
        isActive: true
      },
      include: {
        iplTeam: true
      }
    });

    // Filter out already picked players
    const pickedPlayerIds = matchup.draftPicks.map(pick => pick.playerId);
    const availablePlayers = allPlayers.filter(player => !pickedPlayerIds.includes(player.id));

    return NextResponse.json({
      matchup: matchupWithFilteredStats,
      availablePlayers
    });

  } catch (error) {
    console.error('Error fetching draft details:', error);
    return NextResponse.json(
      { message: 'Failed to fetch draft details', error: error.message },
      { status: 500 }
    );
  }
}
