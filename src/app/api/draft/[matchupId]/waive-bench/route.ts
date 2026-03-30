import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseFirstPickUser, buildFirstPickUser, getEffectivePickSlots } from '@/lib/draftUtils';

// POST /api/draft/[matchupId]/waive-bench
// Allows a user to skip their 2 bench picks once they have ≥5 starter picks.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
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
    if (matchup.status !== 'DRAFTING') {
      return NextResponse.json({ message: 'Draft is not currently active' }, { status: 400 });
    }

    // Identify which user is requesting
    const isUser1 = matchup.user1.user.id === userId;
    const isUser2 = matchup.user2.user.id === userId;
    if (!isUser1 && !isUser2) {
      return NextResponse.json({ message: 'User not part of this matchup' }, { status: 403 });
    }

    const userSignupId = isUser1 ? matchup.user1.id : matchup.user2.id;

    // Must have completed at least 5 starter picks
    const myPicks = matchup.draftPicks.filter(p => p.pickedByUserId === userSignupId);
    if (myPicks.length < 5) {
      return NextResponse.json(
        { message: 'Complete your 5 starter picks before skipping bench' },
        { status: 400 }
      );
    }

    // Parse current waiver state
    const { firstPick, user1WaivedBench, user2WaivedBench } = parseFirstPickUser(matchup.firstPickUser);

    if (!firstPick) {
      return NextResponse.json({ message: 'Toss has not been completed yet' }, { status: 400 });
    }

    // Check not already waived
    const alreadyWaived = isUser1 ? user1WaivedBench : user2WaivedBench;
    if (alreadyWaived) {
      return NextResponse.json({ message: 'Bench picks already waived' }, { status: 400 });
    }

    // Build new firstPickUser encoding with this user's waiver added
    const newFirstPickUser = buildFirstPickUser(
      firstPick,
      isUser1 ? true : user1WaivedBench,
      isUser2 ? true : user2WaivedBench
    );

    await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: { firstPickUser: newFirstPickUser },
    });

    // Auto-complete draft if all effective pick slots are now filled
    const effectiveSlots = getEffectivePickSlots(newFirstPickUser, matchup.user1.id, matchup.user2.id);
    if (matchup.draftPicks.length >= effectiveSlots.length) {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { status: 'COMPLETED' },
      });
      return NextResponse.json({ message: 'Bench picks waived — draft complete!', completed: true });
    }

    return NextResponse.json({ message: 'Bench picks waived', completed: false });
  } catch (error) {
    console.error('Error waiving bench:', error);
    return NextResponse.json({ message: 'Failed to waive bench picks' }, { status: 500 });
  }
}
