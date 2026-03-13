import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Check if max picks reached (10 total: 5 starters each)
    if (matchup.draftPicks.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum picks (10) already reached for this matchup' },
        { status: 400 }
      );
    }

    // Determine next pick order
    const nextPickOrder = matchup.draftPicks.length + 1;

    // Verify this is the correct user's turn (snake draft order)
    const isUser1Turn = matchup.firstPickUser === 'user1' 
      ? nextPickOrder % 2 === 1 
      : nextPickOrder % 2 === 0;
    
    const expectedUserSignupId = isUser1Turn ? matchup.user1Id : matchup.user2Id;
    
    if (userSignupId !== expectedUserSignupId) {
      const expectedUsername = isUser1Turn ? matchup.user1.user.username : matchup.user2.user.username;
      return NextResponse.json(
        { error: `It's ${expectedUsername}'s turn to pick (pick #${nextPickOrder})` },
        { status: 400 }
      );
    }

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        matchupId,
        playerId,
        pickedByUserId: userSignupId,
        pickOrder: nextPickOrder,
        isBench: false // All picks are starters for now (5 each)
      },
      include: {
        player: true
      }
    });

    // Update matchup status if needed
    if (matchup.status === 'WAITING_DRAFT' && nextPickOrder === 1) {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { status: 'DRAFTING' }
      });
    }

    // If all 10 picks are complete, mark as COMPLETED
    if (nextPickOrder === 10) {
      await prisma.headToHeadMatchup.update({
        where: { id: matchupId },
        data: { status: 'COMPLETED' }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Player added successfully',
      pick: {
        id: draftPick.id,
        pickOrder: draftPick.pickOrder,
        player: draftPick.player,
        pickedByUsername: isUser1Turn ? matchup.user1.user.username : matchup.user2.user.username
      }
    });

  } catch (error) {
    console.error('Error adding draft pick:', error);
    return NextResponse.json(
      { error: 'Failed to add draft pick', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
