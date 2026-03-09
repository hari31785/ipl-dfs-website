import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/games/[id] - Get single game details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const game = await prisma.iPLGame.findUnique({
      where: { id: params.id },
      include: {
        team1: true,
        team2: true,
        contests: {
          include: {
            _count: {
              select: {
                signups: true,
                matchups: true
              }
            }
          }
        }
      }
    });

    if (!game) {
      return NextResponse.json(
        { message: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { message: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/games/[id] - Update game
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tournamentId, title, description, team1Id, team2Id, gameDate, signupDeadline } = await request.json();

    // Validation
    if (!tournamentId || !title || !team1Id || !team2Id || !gameDate || !signupDeadline) {
      return NextResponse.json(
        { message: 'Tournament, title, both teams, game date and signup deadline are required' },
        { status: 400 }
      );
    }

    if (team1Id === team2Id) {
      return NextResponse.json(
        { message: 'Teams must be different' },
        { status: 400 }
      );
    }

    const gameDateTime = new Date(gameDate);
    const signupDateTime = new Date(signupDeadline);
    const now = new Date();

    if (signupDateTime >= gameDateTime) {
      return NextResponse.json(
        { message: 'Signup deadline must be before game date' },
        { status: 400 }
      );
    }

    // Check if game exists
    const existingGame = await prisma.iPLGame.findUnique({
      where: { id: params.id }
    });

    if (!existingGame) {
      return NextResponse.json(
        { message: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if tournament and teams exist
    const [tournament, team1, team2] = await Promise.all([
      prisma.tournament.findUnique({ where: { id: tournamentId } }),
      prisma.iPLTeam.findUnique({ where: { id: team1Id } }),
      prisma.iPLTeam.findUnique({ where: { id: team2Id } })
    ]);

    if (!tournament || !team1 || !team2) {
      return NextResponse.json(
        { message: 'Tournament or one or both teams not found' },
        { status: 404 }
      );
    }

    // Determine status based on current time and signup deadline
    let status = existingGame.status;
    if (status === 'UPCOMING' && signupDateTime <= now) {
      status = 'SIGNUP_CLOSED';
    }

    const game = await prisma.iPLGame.update({
      where: { id: params.id },
      data: {
        tournamentId,
        title,
        description,
        team1Id,
        team2Id,
        gameDate: gameDateTime,
        signupDeadline: signupDateTime,
        status
      },
      include: {
        tournament: true,
        team1: true,
        team2: true
      }
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json(
      { message: 'Failed to update game' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/games/[id] - Delete game
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if game exists and has any contests with signups
    const game = await prisma.iPLGame.findUnique({
      where: { id: params.id },
      include: {
        contests: {
          include: {
            _count: {
              select: {
                signups: true
              }
            }
          }
        }
      }
    });

    if (!game) {
      return NextResponse.json(
        { message: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if any contest has signups
    const hasSignups = game.contests.some(contest => contest._count.signups > 0);
    
    if (hasSignups) {
      return NextResponse.json(
        { message: 'Cannot delete game with existing contest signups' },
        { status: 400 }
      );
    }

    // Delete associated contests first, then the game
    await prisma.contest.deleteMany({
      where: { iplGameId: params.id }
    });

    await prisma.iPLGame.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Error deleting game:', error);
    return NextResponse.json(
      { message: 'Failed to delete game' },
      { status: 500 }
    );
  }
}