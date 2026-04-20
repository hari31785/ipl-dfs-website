import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';


// GET /api/admin/contests - List all contests  
export async function GET() {
  try {
    const [contests, statusGroups, pickCountsRaw] = await Promise.all([
      prisma.contest.findMany({
        include: {
          iplGame: {
            include: {
              team1: true,
              team2: true,
              tournament: true
            }
          },
          _count: {
            select: {
              signups: true,
              matchups: true
            }
          }
        },
        orderBy: {
          iplGame: {
            gameDate: 'desc'
          }
        }
      }),
      prisma.headToHeadMatchup.groupBy({
        by: ['contestId', 'status'],
        _count: { _all: true }
      }),
      prisma.$queryRaw<Array<{ contestId: string; count: bigint }>>`
        SELECT m."contestId", COUNT(dp.id) AS count
        FROM "HeadToHeadMatchup" m
        LEFT JOIN "DraftPick" dp ON dp."matchupId" = m.id
        GROUP BY m."contestId"
      `
    ]);

    // Build lookup maps for O(1) access
    const statusMap = new Map<string, Record<string, number>>();
    for (const row of statusGroups) {
      if (!statusMap.has(row.contestId)) statusMap.set(row.contestId, {});
      statusMap.get(row.contestId)![row.status] = row._count._all;
    }
    const pickMap = new Map<string, number>();
    for (const row of pickCountsRaw) {
      pickMap.set(row.contestId, Number(row.count));
    }

    // Add matchup status breakdown to each contest
    const contestsWithStats = contests.map(contest => {
      const statuses = statusMap.get(contest.id) ?? {};
      const matchupStats = {
        waiting: statuses['WAITING_DRAFT'] ?? 0,
        drafting: statuses['DRAFTING'] ?? 0,
        completed: statuses['COMPLETED'] ?? 0,
        totalDraftPicks: pickMap.get(contest.id) ?? 0
      };
      
      return {
        ...contest,
        matchupStats
      };
    });

    return NextResponse.json(contestsWithStats);
  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json(
      { message: 'Failed to fetch contests' },
      { status: 500 }
    );
  }
}

// POST /api/admin/contests - Create new contest
export async function POST(request: NextRequest) {
  try {
    const { contestType, maxParticipants, iplGameId, customCoinValue } = await request.json();

    // Validation
    if (!contestType || !maxParticipants || !iplGameId) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate contest type
    const validContestTypes = ['HIGH_ROLLER', 'REGULAR', 'LOW_STAKES', 'CUSTOM'];
    if (!validContestTypes.includes(contestType)) {
      return NextResponse.json(
        { message: 'Invalid contest type' },
        { status: 400 }
      );
    }

    // Set coinValue based on contest type (not used for entry fee)
    let coinValue: number;
    if (contestType === 'CUSTOM') {
      if (!customCoinValue || isNaN(customCoinValue) || customCoinValue <= 0) {
        return NextResponse.json(
          { message: 'Valid custom coin value is required for CUSTOM contest type' },
          { status: 400 }
        );
      }
      coinValue = customCoinValue;
    } else {
      coinValue = contestType === 'HIGH_ROLLER' ? 100 : contestType === 'REGULAR' ? 50 : 25;
    }

    // Check if game exists and is valid for contest creation
    const game = await prisma.iPLGame.findUnique({
      where: { id: iplGameId }
    });

    if (!game) {
      return NextResponse.json(
        { message: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if game is still upcoming (can create contests)
    if (new Date(game.gameDate) < new Date()) {
      return NextResponse.json(
        { message: 'Cannot create contests for past games' },
        { status: 400 }
      );
    }

    const contest = await prisma.contest.create({
      data: {
        contestType,
        coinValue,
        maxParticipants,
        iplGameId,
        status: 'SIGNUP_OPEN'
      },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        },
        _count: {
          select: {
            signups: true,
            matchups: true
          }
        }
      }
    });

    // New contests are always SIGNUP_OPEN — bust the dashboard tournament cache
    revalidateTag('dashboard-tournaments', 'default')
    return NextResponse.json(contest);
  } catch (error) {
    console.error('Error creating contest:', error);
    return NextResponse.json(
      { message: 'Failed to create contest' },
      { status: 500 }
    );
  }
}