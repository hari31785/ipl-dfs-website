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
    const { playerId, userSignupId, adminOverride } = body;

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

    // Determine the next pick order — use max existing order + 1 to avoid unique-constraint
    // collisions after admin deletes a mid-draft pick (e.g. deleting #10 leaves gap, so
    // length-based calculation would collide with existing pick #14)
    const maxExistingOrder = matchup.draftPicks.reduce((m, p) => Math.max(m, p.pickOrder), 0);
    const nextPickOrder = maxExistingOrder + 1;

    // Hard cap at 14 picks — bypass when admin is explicitly overriding
    if (!adminOverride && nextPickOrder > 14) {
      return NextResponse.json(
        { error: 'Draft is already complete (14 picks maximum)' },
        { status: 400 }
      );
    }

    // Use effective slots for isBench calculation if toss is done
    // Admin can add picks for either user regardless of turn order
    const effectiveSlots = matchup.firstPickUser
      ? getEffectivePickSlots(matchup.firstPickUser, matchup.user1Id, matchup.user2Id)
      : null;

    // Additional cap: respect bench waivers — bypass when admin is overriding
    if (!adminOverride && effectiveSlots && nextPickOrder > effectiveSlots.length) {
      return NextResponse.json(
        { error: `Draft is already complete (${effectiveSlots.length} picks)` },
        { status: 400 }
      );
    }

    // Determine isBench:
    // If toss is done, count starter slots from effective slots; otherwise use pick count
    let isBench: boolean;
    if (effectiveSlots) {
      const starterSlots = effectiveSlots.slice(0, 10);
      const myStarterCount = starterSlots.filter(id => id === userSignupId).length;
      const myPicksSoFar = matchup.draftPicks.filter(p => p.pickedByUserId === userSignupId).length;
      isBench = myPicksSoFar >= myStarterCount;
    } else {
      // Fallback: starters are picks 1-5 per user (first 10 overall)
      const myPicksSoFar = matchup.draftPicks.filter(p => p.pickedByUserId === userSignupId).length;
      isBench = myPicksSoFar >= 5;
    }

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

    // Mark complete when all effective slots are filled (or 14 if no toss done)
    const totalSlots = effectiveSlots ? effectiveSlots.length : 14;
    if (nextPickOrder === totalSlots) {
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
