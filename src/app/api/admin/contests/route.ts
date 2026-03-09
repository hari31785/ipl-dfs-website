import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/contests - List all contests  
export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
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