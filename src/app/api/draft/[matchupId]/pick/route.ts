import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEffectivePickSlots } from '@/lib/draftUtils';

// POST /api/draft/[matchupId]/pick - Make a draft pick
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;
    const { playerId, userId } = await request.json();

    if (!playerId || !userId) {
      return NextResponse.json(
        { message: 'Player ID and User ID are required' },
        { status: 400 }
      );
    }

    // Get matchup with current picks
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: {
          include: {
            user: true
          }
        },
        user2: {
          include: {
            user: true
          }
        },
        draftPicks: {
          orderBy: {
            pickOrder: 'asc'
          }
        }
      }
    });

    if (!matchup) {
      return NextResponse.json(
        { message: 'Matchup not found' },
        { status: 404 }
      );
    }

    if (matchup.status !== 'DRAFTING') {
      return NextResponse.json(
        { message: 'Draft is not currently active' },
        { status: 400 }
      );
    }

    // Check if player is already picked
    const isPlayerPicked = matchup.draftPicks.some(pick => pick.playerId === playerId);
    if (isPlayerPicked) {
      return NextResponse.json(
        { message: 'Player already picked' },
        { status: 400 }
      );
    }

    // Determine whose turn it is
    const currentPickOrder = matchup.draftPicks.length + 1;

    // Build effective pick order (accounts for bench waivers encoded in firstPickUser)
    const effectiveSlots = getEffectivePickSlots(matchup.firstPickUser, matchup.user1.id, matchup.user2.id);

    if (currentPickOrder > effectiveSlots.length) {
      return NextResponse.json(
        { message: 'Draft is complete' },
        { status: 400 }
      );
    }

    const currentTurnSignupId = effectiveSlots[currentPickOrder - 1];

    // Check if it's the user's turn
    const userSignupId = matchup.user1.user.id === userId ? matchup.user1.id : matchup.user2.id;
    
    if (userSignupId !== currentTurnSignupId) {
      return NextResponse.json(
        { message: 'Not your turn to pick' },
        { status: 400 }
      );
    }

    // Determine if this pick is a bench player (after 10 starter picks)
    const isBench = currentPickOrder > 10;

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        matchupId,
        playerId,
        pickedByUserId: userSignupId,
        pickOrder: currentPickOrder,
        isBench
      },
      include: {
        player: {
          include: {
            iplTeam: true
          }
        }
      }
    });

    // If draft is complete, update matchup status
    // NOTE: Contest status remains in DRAFT_PHASE until admin clicks "Start Contest"
    if (currentPickOrder === effectiveSlots.length) {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { status: 'COMPLETED' }
      });
    }

    return NextResponse.json({
      message: 'Pick successful',
      draftPick
    });

  } catch (error) {
    console.error('Error making draft pick:', error);
    return NextResponse.json(
      { message: 'Failed to make draft pick' },
      { status: 500 }
    );
  }
}
