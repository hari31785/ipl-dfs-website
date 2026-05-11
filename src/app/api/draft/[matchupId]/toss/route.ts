import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseFirstPickUser } from '@/lib/draftUtils';
import { sendToUser } from '@/lib/pushNotifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;
    const { firstPickUser, tossWinner } = await request.json();

    if (!firstPickUser || !tossWinner) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch matchup with user details (needed for notifications)
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: { include: { user: true } },
        user2: { include: { user: true } },
      },
    });

    // Save toss result
    const updatedMatchup = await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: { 
        firstPickUser: firstPickUser
      }
    });

    // Only send notifications if both users have resolved their captain decisions
    // This prevents spoiling the toss result before the waiting user answers the captain modal
    if (matchup) {
      const bothResolved = matchup.captainEnabled || matchup.captainDeclined || 
                          (matchup.captainAgreedUser1 && matchup.captainAgreedUser2);
      
      if (bothResolved) {
        const { firstPick } = parseFirstPickUser(firstPickUser);
        const firstPickerUser = firstPick === 'user1' ? matchup.user1.user : matchup.user2.user;
        const secondPickerUser = firstPick === 'user1' ? matchup.user2.user : matchup.user1.user;
        const draftUrl = `/draft/${matchupId}`;
        await Promise.allSettled([
          sendToUser(firstPickerUser.id, {
            title: '🏆 Draft Started — You Pick First!',
            body: 'The toss is done. Make your first pick now!',
            url: draftUrl,
          }),
          sendToUser(secondPickerUser.id, {
            title: '🏆 Draft Started!',
            body: `${firstPickerUser.name} won the toss and picks first. Get ready!`,
            url: draftUrl,
          }),
        ]).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      matchup: updatedMatchup
    });

  } catch (error) {
    console.error('Error saving toss result:', error);
    return NextResponse.json(
      { message: 'Failed to save toss result' },
      { status: 500 }
    );
  } finally {
  }
}
