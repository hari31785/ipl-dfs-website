import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Check if any drafting has begun
    const hasDraftingStarted = contest.matchups.some(
      matchup => matchup._count.draftPicks > 0
    );

    if (hasDraftingStarted) {
      return NextResponse.json(
        { message: 'Cannot reopen signups - drafting has already begun' },
        { status: 400 }
      );
    }

    // Delete all matchups if they exist
    if (contest._count.matchups > 0) {
      await prisma.headToHeadMatchup.deleteMany({
        where: { contestId: contest.id }
      });
      console.log(`🗑️ Deleted ${contest._count.matchups} matchups for contest ${contest.id}`);
    }

    // Reopen the contest
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
