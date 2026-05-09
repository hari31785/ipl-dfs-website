import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToUser } from '@/lib/pushNotifications';

// POST /api/draft/[matchupId]/captain/pick
// Body: { userId: string, draftPickId: string }
// Saves the user's chosen captain (a starter DraftPick). Only valid when captainEnabled=true
// and the game has not gone LIVE yet.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;
    const body = await req.json();
    const { userId, draftPickId } = body as { userId: string; draftPickId: string };

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    if (!draftPickId) {
      return NextResponse.json({ message: 'draftPickId is required' }, { status: 400 });
    }

    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: { include: { user: true } },
        user2: { include: { user: true } },
        draftPicks: true,
      },
    });

    if (!matchup) {
      return NextResponse.json({ message: 'Matchup not found' }, { status: 404 });
    }

    if (!matchup.captainEnabled) {
      return NextResponse.json({ message: 'Captain bonus is not enabled for this matchup' }, { status: 400 });
    }

    // Captain picks must be set before the game goes LIVE
    if (matchup.status === 'COMPLETED') {
      return NextResponse.json({ message: 'Draft is already completed' }, { status: 400 });
    }

    const isUser1 = matchup.user1.user.id === userId;
    const isUser2 = matchup.user2.user.id === userId;

    if (!isUser1 && !isUser2) {
      return NextResponse.json({ message: 'Not a participant in this matchup' }, { status: 403 });
    }

    // Validate: the draftPickId must belong to this matchup AND be a starter (not bench) AND belong to this user
    const pick = matchup.draftPicks.find(p => p.id === draftPickId);
    if (!pick) {
      return NextResponse.json({ message: 'Draft pick not found in this matchup' }, { status: 400 });
    }
    if (pick.isBench) {
      return NextResponse.json({ message: 'Captain must be a starter, not a bench player' }, { status: 400 });
    }

    const signupId = isUser1 ? matchup.user1.id : matchup.user2.id;
    if (pick.pickedByUserId !== signupId) {
      return NextResponse.json({ message: 'This pick does not belong to you' }, { status: 403 });
    }

    // Save the captain pick
    const updateData = isUser1
      ? { user1CaptainPickId: draftPickId }
      : { user2CaptainPickId: draftPickId };

    const updated = await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: updateData,
    });

    // Check if both users have now picked their captain
    const bothPicked = updated.user1CaptainPickId != null && updated.user2CaptainPickId != null;
    const opponentUser = isUser1 ? matchup.user2.user : matchup.user1.user;
    const myUser = isUser1 ? matchup.user1.user : matchup.user2.user;

    if (bothPicked) {
      // Notify both: captains are locked in
      await sendToUser(myUser.id, {
        title: '🎖️ Captains Locked!',
        body: 'Both captains are set. May the best captain win!',
        url: `/scores/${matchupId}`,
      });
      await sendToUser(opponentUser.id, {
        title: '🎖️ Captains Locked!',
        body: 'Both captains are set. May the best captain win!',
        url: `/scores/${matchupId}`,
      });
    } else {
      // Notify opponent: you've picked, they haven't yet
      await sendToUser(opponentUser.id, {
        title: '🎖️ Pick Your Captain!',
        body: `${myUser.username ?? myUser.name} has picked their captain. Your turn!`,
        url: `/draft/${matchupId}`,
      });
    }

    return NextResponse.json({
      success: true,
      captainPickId: draftPickId,
      bothPicked,
    });
  } catch (error) {
    console.error('[captain/pick]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
