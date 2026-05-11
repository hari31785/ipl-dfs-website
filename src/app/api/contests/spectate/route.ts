import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateFinalLineup } from '@/lib/benchSwapUtils';

// Spectate view shows live contest scores — 5 min cache is a reasonable
// trade-off between freshness and DB load.
export const revalidate = 300; // 5 minutes

// GET /api/contests/spectate - Returns all LIVE/ACTIVE contests with matchups and scores
// Accessible to any authenticated user (no auth check here; UI is behind the dashboard login)
export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      where: {
        status: { in: ['LIVE', 'ACTIVE'] }
      },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true,
            tournament: true
          }
        },
        matchups: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true,
            status: true,
            user1Id: true,
            user2Id: true,
            captainEnabled: true,
            user1CaptainPickId: true,
            user2CaptainPickId: true,
            user1: {
              select: {
                id: true,
                user: {
                  select: { id: true, name: true, username: true }
                }
              }
            },
            user2: {
              select: {
                id: true,
                user: {
                  select: { id: true, name: true, username: true }
                }
              }
            },
            draftPicks: {
              select: {
                id: true,
                playerId: true,
                pickOrder: true,
                pickedByUserId: true,
                isBench: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    iplTeam: {
                      select: { id: true, name: true, shortName: true, color: true }
                    },
                    stats: {
                      select: {
                        iplGameId: true,
                        points: true,
                        didNotPlay: true,
                        runs: true,
                        wickets: true,
                        catches: true,
                        runOuts: true,
                        stumpings: true
                      }
                    }
                  }
                }
              },
              orderBy: { pickOrder: 'asc' }
            }
          }
        }
      },
      orderBy: {
        iplGame: { gameDate: 'asc' }
      }
    });

    // Compute scores per matchup server-side (bench swap applied) and strip raw picks
    const contestsWithScores = contests.map(contest => ({
      id: contest.id,
      status: contest.status,
      contestType: contest.contestType,
      coinValue: contest.coinValue,
      iplGame: contest.iplGame,
      matchups: contest.matchups.map(matchup => {
        const iplGameId = contest.iplGame.id;

        const user1Picks = matchup.draftPicks.filter(
          p => p.pickedByUserId === matchup.user1.id
        );
        const user2Picks = matchup.draftPicks.filter(
          p => p.pickedByUserId === matchup.user2.id
        );

        const { finalLineup: user1Lineup } = calculateFinalLineup(
          user1Picks as any, 
          iplGameId, 
          matchup.user1CaptainPickId
        );
        const { finalLineup: user2Lineup } = calculateFinalLineup(
          user2Picks as any, 
          iplGameId, 
          matchup.user2CaptainPickId
        );
        
        const user1Score = user1Lineup.reduce((sum, p) => sum + p.points, 0);
        const user2Score = user2Lineup.reduce((sum, p) => sum + p.points, 0);

        return {
          id: matchup.id,
          status: matchup.status,
          user1: matchup.user1,
          user2: matchup.user2,
          user1Score,
          user2Score,
          captainEnabled: matchup.captainEnabled,
          draftPicksCount: matchup.draftPicks.length
        };
      })
    }));

    return NextResponse.json({ contests: contestsWithScores });
  } catch (error) {
    console.error('Error fetching spectate data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch spectate data' },
      { status: 500 }
    );
  }
}
