import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToUser } from '@/lib/pushNotifications';
import { parseFirstPickUser } from '@/lib/draftUtils';

// POST /api/draft/[matchupId]/captain/decline
// Body: { userId: string }
// Called when a user declines the captain bonus. Permanently disables it for this matchup.
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

    const isUser1 = matchup.user1.user.id === userId;
    const isUser2 = matchup.user2.user.id === userId;

    if (!isUser1 && !isUser2) {
      return NextResponse.json({ message: 'Not a participant in this matchup' }, { status: 403 });
    }

    // Mark as declined — captain feature is off for this matchup permanently
    // Only set the declining user's flag, preserve the other user's choice for display
    const declineData = {
      captainDeclined: true,
      captainEnabled: false,
      ...(isUser1 ? { captainAgreedUser1: false } : { captainAgreedUser2: false }),
    };
    
    const updated = await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: declineData,
    });

    // If toss is already done and this user just declined, send them the draft start notification
    if (updated.firstPickUser) {
      const myUser = isUser1 ? matchup.user1.user : matchup.user2.user;
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

    return NextResponse.json({ declined: true, captainEnabled: false });
  } catch (error) {
    console.error('[captain/decline]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
