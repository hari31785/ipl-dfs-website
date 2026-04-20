import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';


// GET /api/admin/contests - List all contests  
export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true,
            tournament: true
          }
        },
        matchups: {
          select: {
            status: true,
            _count: {
              select: {
                draftPicks: true
              }
            }
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
    });

    // Add matchup status breakdown to each contest
    const contestsWithStats = contests.map(contest => {
      const matchupStats = {
        waiting: contest.matchups.filter(m => m.status === 'WAITING_DRAFT').length,
        drafting: contest.matchups.filter(m => m.status === 'DRAFTING').length,
        completed: contest.matchups.filter(m => m.status === 'COMPLETED').length,
        totalDraftPicks: contest.matchups.reduce((sum, m) => sum + m._count.draftPicks, 0)
      };
      
      return {
        ...contest,
        matchupStats,
        matchups: undefined // Remove detailed matchups from response
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