import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEffectivePickSlots } from '@/lib/draftUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;
    const body = await request.json();
    const { playerId, userSignupId } = body;

    // Validate input
    if (!playerId || !userSignupId) {
      return NextResponse.json(
        { error: 'playerId and userSignupId are required' },
        { status: 400 }
      );
    }

    // Get the matchup with draft picks
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        draftPicks: {
          include: {
            player: true
          }
        },
        user1: {
          include: {
            user: true
          }
        },
        user2: {
          include: {
            user: true
          }
        }
      }
    });

    if (!matchup) {
      return NextResponse.json(
        { error: 'Matchup not found' },
        { status: 404 }
      );
    }

    // Verify the userSignupId is part of this matchup
    if (userSignupId !== matchup.user1Id && userSignupId !== matchup.user2Id) {
      return NextResponse.json(
        { error: 'User is not part of this matchup' },
        { status: 400 }
      );
    }

    // Check if player is already picked in this matchup
    const existingPick = matchup.draftPicks.find(pick => pick.playerId === playerId);
    if (existingPick) {
      return NextResponse.json(
        { error: 'Player already picked in this matchup' },
        { status: 400 }
      );
    }

    // Determine the effective pick slots using the real snake order (handles bench waivers)
    if (!matchup.firstPickUser) {
      return NextResponse.json(
        { error: 'Toss has not been done yet — firstPickUser is not set' },
        { status: 400 }
      );
    }
    const effectiveSlots = getEffectivePickSlots(matchup.firstPickUser, matchup.user1Id, matchup.user2Id);

    // Check if max picks reached
    if (matchup.draftPicks.length >= effectiveSlots.length) {
      return NextResponse.json(
        { error: `Draft is already complete (${effectiveSlots.length} picks)` },
        { status: 400 }
      );
    }

    // Determine next pick order
    const nextPickOrder = matchup.draftPicks.length + 1;

    // Verify correct user's turn using snake order
    const expectedSignupId = effectiveSlots[nextPickOrder - 1];
    if (userSignupId !== expectedSignupId) {
      const expectedUser = expectedSignupId === matchup.user1Id ? matchup.user1.user.username : matchup.user2.user.username;
      return NextResponse.json(
        { error: `It's ${expectedUser}'s turn to pick (pick #${nextPickOrder})` },
        { status: 400 }
      );
    }

    // Bench picks are slots 11+ in the full 14-pick sequence (slot index in 1-based)
    // Count how many starter slots belong to each user (first 10 picks)
    const starterSlots = effectiveSlots.slice(0, 10);
    const myStarterCount = starterSlots.filter(id => id === userSignupId).length;
    const myPicksSoFar = matchup.draftPicks.filter(p => p.pickedByUserId === userSignupId).length;
    const isBench = myPicksSoFar >= myStarterCount;

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        matchupId,
        playerId,
        pickedByUserId: userSignupId,
        pickOrder: nextPickOrder,
        isBench,
      },
      include: {
        player: true,
      }
    });

    // Activate matchup if it was waiting
    if (matchup.status === 'WAITING_DRAFT' && nextPickOrder === 1) {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { status: 'DRAFTING' }
      });
    }

    // Mark complete when all effective slots are filled
    if (nextPickOrder === effectiveSlots.length) {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { status: 'COMPLETED' }
      });
    }

    const pickedByUsername = userSignupId === matchup.user1Id ? matchup.user1.user.username : matchup.user2.user.username;
    return NextResponse.json({
      success: true,
      message: 'Player added successfully',
      pick: {
        id: draftPick.id,
        pickOrder: draftPick.pickOrder,
        player: draftPick.player,
        pickedByUsername,
      }
    });

  } catch (error) {
    console.error('Error adding draft pick:', error);
    return NextResponse.json(
      { error: 'Failed to add draft pick', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
