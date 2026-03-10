import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/admin/contests/[id]/create-matchup - Create a custom H2H matchup
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;
    const body = await request.json();
    const { user1Username, user2Username } = body;

    if (!user1Username || !user2Username) {
      return NextResponse.json(
        { message: 'Both user usernames are required' },
        { status: 400 }
      );
    }

    if (user1Username === user2Username) {
      return NextResponse.json(
        { message: 'Cannot create matchup with the same user' },
        { status: 400 }
      );
    }

    // Get the contest
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        iplGame: true,
        signups: {
          include: {
            user: true
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    // Find the users by username
    const user1 = await prisma.user.findUnique({
      where: { username: user1Username }
    });

    const user2 = await prisma.user.findUnique({
      where: { username: user2Username }
    });

    if (!user1) {
      return NextResponse.json(
        { message: `User "${user1Username}" not found` },
        { status: 404 }
      );
    }

    if (!user2) {
      return NextResponse.json(
        { message: `User "${user2Username}" not found` },
        { status: 404 }
      );
    }

    // Check if users are already signed up for this contest
    let signup1 = contest.signups.find(s => s.userId === user1.id);
    let signup2 = contest.signups.find(s => s.userId === user2.id);

    // Create signups if they don't exist
    if (!signup1) {
      const newSignup1 = await prisma.contestSignup.create({
        data: {
          contestId: contest.id,
          userId: user1.id
        },
        include: {
          user: true
        }
      });
      signup1 = newSignup1;
    }

    if (!signup2) {
      const newSignup2 = await prisma.contestSignup.create({
        data: {
          contestId: contest.id,
          userId: user2.id
        },
        include: {
          user: true
        }
      });
      signup2 = newSignup2;
    }

    // Allow multiple matchups for same users in same contest
    // Admin can create as many matchups as needed

    // Determine matchup status based on contest status
    let matchupStatus: 'WAITING_DRAFT' | 'DRAFTING' = 'WAITING_DRAFT';
    if (contest.status === 'DRAFT_PHASE' || contest.status === 'DRAFTING') {
      matchupStatus = 'DRAFTING';
    }

    // Randomly determine who gets first pick
    const firstPickUser = Math.random() < 0.5 ? signup1.id : signup2.id;

    // Create the matchup
    const matchup = await prisma.headToHeadMatchup.create({
      data: {
        contestId: contest.id,
        user1Id: signup1.id,
        user2Id: signup2.id,
        firstPickUser: firstPickUser,
        status: matchupStatus,
        user1Score: 0,
        user2Score: 0
      },
      include: {
        user1: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        },
        user2: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      message: `Custom matchup created: ${user1.username} vs ${user2.username}`,
      matchup: {
        id: matchup.id,
        user1: matchup.user1.user.username,
        user2: matchup.user2.user.username,
        status: matchup.status,
        firstPick: matchup.firstPickUser === signup1.id ? user1.username : user2.username
      }
    });

  } catch (error) {
    console.error('Error creating custom matchup:', error);
    return NextResponse.json(
      { message: 'Failed to create custom matchup', error: String(error) },
      { status: 500 }
    );
  }
}
