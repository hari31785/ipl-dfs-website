import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// PUT /api/admin/matchups/[id]/update-users - Update matchup opponents
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;
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

    // Get the existing matchup
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
        contest: {
          include: {
            iplGame: true,
            signups: {
              include: {
                user: true
              }
            }
          }
        },
        draftPicks: true
      }
    });

    if (!matchup) {
      return NextResponse.json(
        { message: 'Matchup not found' },
        { status: 404 }
      );
    }

    // Check if drafting has started
    if (matchup.draftPicks.length > 0) {
      return NextResponse.json(
        { 
          message: 'Cannot update matchup opponents after drafting has started. Delete draft picks first or create a new matchup.',
          draftPickCount: matchup.draftPicks.length
        },
        { status: 400 }
      );
    }

    // Find the new users
    const newUser1 = await prisma.user.findUnique({
      where: { username: user1Username }
    });

    const newUser2 = await prisma.user.findUnique({
      where: { username: user2Username }
    });

    if (!newUser1) {
      return NextResponse.json(
        { message: `User "${user1Username}" not found` },
        { status: 404 }
      );
    }

    if (!newUser2) {
      return NextResponse.json(
        { message: `User "${user2Username}" not found` },
        { status: 404 }
      );
    }

    // Check if the same users are already in the matchup (no change needed)
    const existingUserIds = [matchup.user1.user.id, matchup.user2.user.id].sort();
    const newUserIds = [newUser1.id, newUser2.id].sort();
    
    if (existingUserIds[0] === newUserIds[0] && existingUserIds[1] === newUserIds[1]) {
      return NextResponse.json(
        { message: 'These users are already in this matchup' },
        { status: 400 }
      );
    }

    // Allow multiple matchups for same users in same contest
    // Admin can update to create as many matchups as needed

    // Get or create signups for new users
    let signup1 = matchup.contest.signups.find(s => s.userId === newUser1.id);
    let signup2 = matchup.contest.signups.find(s => s.userId === newUser2.id);

    if (!signup1) {
      signup1 = await prisma.contestSignup.create({
        data: {
          contestId: matchup.contestId,
          userId: newUser1.id
        },
        include: {
          user: true
        }
      });
    }

    if (!signup2) {
      signup2 = await prisma.contestSignup.create({
        data: {
          contestId: matchup.contestId,
          userId: newUser2.id
        },
        include: {
          user: true
        }
      });
    }

    // Update the matchup with new users
    const updatedMatchup = await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: {
        user1Id: signup1.id,
        user2Id: signup2.id,
        // Reset scores
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

    // Note: Old signups are kept in case they're used elsewhere or for historical tracking
    // If needed, we could clean up orphaned signups separately

    return NextResponse.json({
      message: `Matchup updated: ${newUser1.username} vs ${newUser2.username}`,
      matchup: {
        id: updatedMatchup.id,
        user1: updatedMatchup.user1.user.username,
        user2: updatedMatchup.user2.user.username,
        status: updatedMatchup.status
      }
    });

  } catch (error) {
    console.error('Error updating matchup:', error);
    return NextResponse.json(
      { message: 'Failed to update matchup', error: String(error) },
      { status: 500 }
    );
  }
}
