import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToUser } from '@/lib/pushNotifications';
import { parseFirstPickUser } from '@/lib/draftUtils';

// POST /api/draft/[matchupId]/captain/agree
// Body: { userId: string }
// Called when a user opts into the captain bonus for this matchup.
// Both users must agree before the captain feature is active.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;
    const { userId } = await req.json() as { userId: string };

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: { include: { user: true } },
        user2: { include: { user: true } },
      },
    });

    if (!matchup) {
      return NextResponse.json({ message: 'Matchup not found' }, { status: 404 });
    }

    // Only allow during draft phase
    if (matchup.status !== 'PENDING' && matchup.status !== 'IN_PROGRESS' && matchup.status !== 'DRAFTING') {
      return NextResponse.json(
        { message: 'Captain agreement can only be set during draft phase' },
        { status: 400 }
      );
    }

    // Cannot agree if already declined
    if (matchup.captainDeclined) {
      return NextResponse.json(
        { message: 'Captain bonus was already declined for this matchup' },
        { status: 400 }
      );
    }

    const isUser1 = matchup.user1.user.id === userId;
    const isUser2 = matchup.user2.user.id === userId;

    if (!isUser1 && !isUser2) {
      return NextResponse.json({ message: 'Not a participant in this matchup' }, { status: 403 });
    }

    // Update the appropriate agree flag
    const updateData = isUser1
      ? { captainAgreedUser1: true }
      : { captainAgreedUser2: true };

    const updated = await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: updateData,
    });

    // Check if both have now agreed — activate captain mode
    const bothAgreed = updated.captainAgreedUser1 && updated.captainAgreedUser2;
    if (bothAgreed) {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { captainEnabled: true },
      });

      // Push notification to both: time to pick captains after draft
      const opponentUser = isUser1 ? matchup.user2.user : matchup.user1.user;
      const myUser = isUser1 ? matchup.user1.user : matchup.user2.user;

      await sendToUser(myUser.id, {
        title: '🎖️ Captain Mode Active!',
        body: `Both you and ${opponentUser.username ?? opponentUser.name} agreed. Pick your captain after the draft!`,
        url: `/draft/${matchupId}`,
      });
      await sendToUser(opponentUser.id, {
        title: '🎖️ Captain Mode Active!',
        body: `Both you and ${myUser.username ?? myUser.name} agreed. Pick your captain after the draft!`,
        url: `/draft/${matchupId}`,
      });

      return NextResponse.json({ agreed: true, captainEnabled: true, bothAgreed: true });
    }

    // Only one has agreed so far — notify the opponent so they know to respond.
    const opponentUser = isUser1 ? matchup.user2.user : matchup.user1.user;
    const myUser = isUser1 ? matchup.user1.user : matchup.user2.user;
    await sendToUser(opponentUser.id, {
      title: '🎖️ Captain Challenge',
      body: `${myUser.username ?? myUser.name} wants to enable the Captain Bonus. Open the draft to respond!`,
      url: `/draft/${matchupId}`,
    });

    // If toss is already done and this user just answered, send them the draft start notification
    if (updated.firstPickUser) {
      const { firstPick } = parseFirstPickUser(updated.firstPickUser);
      const firstPickerUser = firstPick === 'user1' ? matchup.user1.user : matchup.user2.user;
      const isFirstPicker = myUser.id === firstPickerUser.id;
      
      await sendToUser(myUser.id, {
        title: isFirstPicker ? '🏆 Draft Started — You Pick First!' : '🏆 Draft Started!',
        body: isFirstPicker 
          ? 'The toss is done. Make your first pick now!' 
          : `${firstPickerUser.name} won the toss and picks first. Get ready!`,
        url: `/draft/${matchupId}`,
      });
    }

    return NextResponse.json({ agreed: true, captainEnabled: false, bothAgreed: false });
  } catch (error) {
    console.error('[captain/agree]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
