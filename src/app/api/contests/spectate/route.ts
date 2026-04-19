import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils';

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
          include: {
            user1: {
              include: {
                user: {
                  select: { id: true, name: true, username: true }
                }
              }
            },
            user2: {
              include: {
                user: {
                  select: { id: true, name: true, username: true }
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

        const user1Score = calculateTotalPointsWithSwap(user1Picks as any, iplGameId);
        const user2Score = calculateTotalPointsWithSwap(user2Picks as any, iplGameId);

        return {
          id: matchup.id,
          status: matchup.status,
          user1: matchup.user1,
          user2: matchup.user2,
          user1Score,
          user2Score,
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
