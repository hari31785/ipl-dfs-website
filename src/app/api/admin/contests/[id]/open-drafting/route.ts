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
    const gameTitle = `${updatedContest.iplGame.team1.shortName} vs ${updatedContest.iplGame.team2.shortName}`;
    const contestTypeLabel =
      updatedContest.contestType === 'HIGH_ROLLER' ? 'High Roller (100 coins)' :
      updatedContest.contestType === 'REGULAR'     ? 'Regular (50 coins)' :
      updatedContest.contestType === 'LOW_STAKES'  ? 'Low Stakes (25 coins)' :
      `${updatedContest.coinValue} coins`;

    // Build signupId → opponent username map from matchups.
    // Keyed by ContestSignup ID so users with multiple entries get correct opponents.
    const matchupsForNotif = await prisma.headToHeadMatchup.findMany({
      where: { contestId: id },
      include: {
        user1: { include: { user: { select: { id: true, username: true } } } },
        user2: { include: { user: { select: { id: true, username: true } } } },
      },
    });
    const opponentMap = new Map<string, string>();
    for (const m of matchupsForNotif) {
      opponentMap.set(m.user1Id, m.user2.user.username);
      opponentMap.set(m.user2Id, m.user1.user.username);
    }

    const signups = await prisma.contestSignup.findMany({
      where: { contestId: id },
      select: { id: true, userId: true },
    });

    // Group signups by userId — only include signups that have a matchup.
    // Users whose matchup was deleted still have a ContestSignup record but no
    // entry in opponentMap, so we skip them to avoid spurious notifications.
    const byUser = new Map<string, string[]>();
    for (const s of signups) {
      const opp = opponentMap.get(s.id);
      if (!opp) continue; // no matchup for this signup — skip
      const opponents = byUser.get(s.userId) ?? [];
      opponents.push(opp);
      byUser.set(s.userId, opponents);
    }

    await Promise.all(
      Array.from(byUser.entries()).map(([userId, opponents]) => {
        const body = opponents.length > 1
          ? `You have ${opponents.length} drafts open in ${gameTitle} (vs @${opponents.join(', @')}) — draft your teams now!`
          : opponents.length === 1
            ? `You're up against @${opponents[0]} in ${gameTitle} — draft your team now!`
            : `Your draft for ${gameTitle} is open — draft your team now!`;
        return sendToUser(userId, {
          title: `⚡ Draft Open · ${contestTypeLabel}`,
          body,
          icon: '/icon-192.png',
          url: '/dashboard?tab=my-contests&sub=upcoming',
        });
      })
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
