import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// POST /api/admin/contests/[id]/reopen-signups
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            matchups: true
          }
        },
        matchups: {
          include: {
            _count: {
              select: {
                draftPicks: true
              }
            }
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    // Just reopen the contest without deleting matchups
    // This allows more users to join while preserving existing matchups
    const updatedContest = await prisma.contest.update({
      where: { id },
      data: { status: 'SIGNUP_OPEN' },
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

    console.log(`✅ Reopened signups for contest ${contest.id}`);

    return NextResponse.json({
      message: 'Signups reopened successfully',
      contest: updatedContest
    });

  } catch (error) {
    console.error('Error reopening signups:', error);
    return NextResponse.json(
      { message: 'Failed to reopen signups' },
      { status: 500 }
    );
  }
}
