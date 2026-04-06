import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;

    // Get user from request (you'll need to implement proper auth)
    const userEmail = request.headers.get('x-user-email');
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if contest exists and get its status
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        iplGame: {
          select: {
            status: true,
            signupDeadline: true,
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Contest not found' },
        { status: 404 }
      );
    }

    // Check if signup deadline has passed
    if (new Date() > new Date(contest.iplGame.signupDeadline)) {
      return NextResponse.json(
        { error: 'Cannot unjoin - signup deadline has passed' },
        { status: 400 }
      );
    }

    // Check if contest status allows unjoining
    if (!['SIGNUP_OPEN', 'SIGNUP_CLOSED'].includes(contest.status)) {
      return NextResponse.json(
        { error: 'Cannot unjoin - contest has already started' },
        { status: 400 }
      );
    }

    // Find the most recent entry for this user (latest signup = highest entryNumber)
    const signup = await prisma.contestSignup.findFirst({
      where: { contestId, userId: user.id },
      orderBy: { signupAt: 'desc' }
    });

    if (!signup) {
      return NextResponse.json(
        { error: 'You are not joined to this contest' },
        { status: 400 }
      );
    }

    // Check if user has any matchups (draft has started)
    const matchups = await prisma.headToHeadMatchup.findMany({
      where: {
        contestId,
        OR: [
          { user1Id: signup.id },
          { user2Id: signup.id }
        ]
      }
    });

    if (matchups.length > 0 && matchups.some(m => m.status !== 'WAITING_DRAFT')) {
      return NextResponse.json(
        { error: 'Cannot unjoin - matchups have been created and draft may have started' },
        { status: 400 }
      );
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete any waiting matchups
      if (matchups.length > 0) {
        await tx.headToHeadMatchup.deleteMany({
          where: {
            contestId,
            OR: [
              { user1Id: signup.id },
              { user2Id: signup.id }
            ],
            status: 'WAITING_DRAFT'
          }
        });
      }

      // Delete this specific signup entry
      await tx.contestSignup.delete({
        where: { id: signup.id }
      });

      // Decrease totalSignups
      await tx.contest.update({
        where: { id: contestId },
        data: {
          totalSignups: {
            decrement: 1
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully left the contest'
    });

  } catch (error) {
    console.error('Error unjoining contest:', error);
    return NextResponse.json(
      { error: 'Failed to leave contest' },
      { status: 500 }
    );
  }
}
