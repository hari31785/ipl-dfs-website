import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToUser } from '@/lib/pushNotifications';


// POST /api/admin/contests/[id]/open-drafting
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
            matchups: true,
            signups: true
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

    if (contest.status !== 'SIGNUP_CLOSED' && contest.status !== 'DRAFT_PHASE') {
      return NextResponse.json(
        { message: 'Contest must be in SIGNUP_CLOSED or DRAFT_PHASE status to open drafting' },
        { status: 400 }
      );
    }

    if (contest._count.matchups === 0) {
      return NextResponse.json(
        { message: 'Matchups must be generated before opening drafting window' },
        { status: 400 }
      );
    }

    const updatedContest = await prisma.contest.update({
      where: { id },
      data: { status: 'DRAFT_PHASE' },
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

    // Update all matchups to DRAFTING status
    await prisma.headToHeadMatchup.updateMany({
      where: {
        contestId: id,
        status: 'WAITING_DRAFT'
      },
      data: {
        status: 'DRAFTING'
      }
    });

    console.log(`✅ Opened drafting window for contest ${contest.id} with ${updatedContest._count.matchups} matchups`);

    // Push notifications: tell all signed-up users that the draft is open
    const signups = await prisma.contestSignup.findMany({
      where: { contestId: id },
      select: { userId: true },
    });
    const gameTitle = `${updatedContest.iplGame.team1.shortName} vs ${updatedContest.iplGame.team2.shortName}`;
    await Promise.all(
      signups.map((s) =>
        sendToUser(s.userId, {
          title: '⚡ Draft is now open!',
          body: `Draft your team for ${gameTitle} before your opponent does!`,
          icon: '/icon-192.png',
          url: '/dashboard?tab=my-contests&sub=upcoming',
        })
      )
    );

    return NextResponse.json({
      message: 'Drafting window opened successfully',
      contest: updatedContest
    });

  } catch (error) {
    console.error('Error opening drafting window:', error);
    return NextResponse.json(
      { message: 'Failed to open drafting window' },
      { status: 500 }
    );
  }
}
