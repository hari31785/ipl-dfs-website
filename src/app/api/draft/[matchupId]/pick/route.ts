import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    
    if (currentPickOrder > 10) {
      return NextResponse.json(
        { message: 'Draft is complete' },
        { status: 400 }
      );
    }

    // Snake draft logic
    const round = Math.ceil(currentPickOrder / 2);
    const isOddRound = round % 2 === 1;
    const firstPicker = matchup.firstPickUser === 'user1' ? matchup.user1.id : matchup.user2.id;
    
    let currentTurnSignupId: string;
    if (isOddRound) {
      currentTurnSignupId = currentPickOrder % 2 === 1 ? firstPicker : (firstPicker === matchup.user1.id ? matchup.user2.id : matchup.user1.id);
    } else {
      currentTurnSignupId = currentPickOrder % 2 === 0 ? firstPicker : (firstPicker === matchup.user1.id ? matchup.user2.id : matchup.user1.id);
    }

    // Check if it's the user's turn
    const userSignupId = matchup.user1.user.id === userId ? matchup.user1.id : matchup.user2.id;
    
    if (userSignupId !== currentTurnSignupId) {
      return NextResponse.json(
        { message: 'Not your turn to pick' },
        { status: 400 }
      );
    }

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        matchupId,
        playerId,
        pickedByUserId: userSignupId,
        pickOrder: currentPickOrder
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
    if (currentPickOrder === 10) {
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
