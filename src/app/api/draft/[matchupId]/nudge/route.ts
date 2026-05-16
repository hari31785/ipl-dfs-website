import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendToUser } from "@/lib/pushNotifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { matchupId } = await params;

    // Get matchup with signup info
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              }
            }
          }
        },
        user2: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              }
            }
          }
        },
        draftPicks: {
          select: { pickOrder: true },
          orderBy: { pickOrder: 'desc' },
          take: 1,
        },
      },
    });

    if (!matchup) {
      return NextResponse.json({ message: "Matchup not found" }, { status: 404 });
    }

    // Check if user is part of this matchup
    const isUser1 = matchup.user1.userId === userId;
    const isUser2 = matchup.user2.userId === userId;

    if (!isUser1 && !isUser2) {
      return NextResponse.json({ message: "Not authorized for this matchup" }, { status: 403 });
    }

    // Check if matchup is in drafting status
    if (matchup.status !== 'DRAFTING') {
      return NextResponse.json({ message: "Draft is not active" }, { status: 400 });
    }

    // Get opponent info
    const nudger = isUser1 ? matchup.user1.user : matchup.user2.user;
    const opponent = isUser1 ? matchup.user2.user : matchup.user1.user;

    // Toss-waiting scenario: toss hasn't been called yet
    // The nudger is waiting; the opponent (toss caller) needs to act.
    const tossPending = !matchup.firstPickUser;

    if (!tossPending) {
      // Normal pick-turn nudge — verify it's actually the opponent's turn
      const lastPickOrder = matchup.draftPicks[0]?.pickOrder ?? 0;
      const nextPickOrder = lastPickOrder + 1;

      let isUser1Turn: boolean;
      if (matchup.firstPickUser === 'user1') {
        isUser1Turn = [1,4,5,8,9,12,13].includes(nextPickOrder);
      } else {
        isUser1Turn = [2,3,6,7,10,11,14].includes(nextPickOrder);
      }

      if ((isUser1 && isUser1Turn) || (isUser2 && !isUser1Turn)) {
        return NextResponse.json(
          { message: "It's your turn to pick!" },
          { status: 400 }
        );
      }
    }

    // Try to send push notification
    let pushSent = false;
    try {
      await sendToUser(opponent.id, tossPending ? {
        title: `🪙 @${nudger.username} is waiting!`,
        body: `Your opponent is in the draft room — go call the toss!`,
        icon: '/icon-192x192.png',
        url: `/draft/${matchupId}`,
      } : {
        title: `⏰ @${nudger.username} is waiting!`,
        body: `Your opponent is waiting for your draft pick`,
        icon: '/icon-192x192.png',
        url: `/draft/${matchupId}`,
      });
      pushSent = true;
    } catch (pushError) {
      console.error('Push notification failed:', pushError);
      // Continue even if push fails
    }

    // Return 5-minute cooldown
    const cooldownEndsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      pushSent,
      cooldownEndsAt,
      message: pushSent 
        ? `Nudged @${opponent.username}! They received a push notification.`
        : `Nudged @${opponent.username}! They'll see it when they check back.`,
    });

  } catch (error) {
    console.error("Error nudging opponent:", error);
    return NextResponse.json(
      { message: "Failed to nudge opponent" },
      { status: 500 }
    );
  }
}
