import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/contests/[id]/signups/[signupId] - Remove a user from a contest
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signupId: string }> }
) {
  try {
    const { id, signupId } = await params;
    
    // First check if the signup exists and get contest info
    const signup = await prisma.contestSignup.findUnique({
      where: { id: signupId },
      include: {
        contest: true,
        matchupsAsUser1: true,
        matchupsAsUser2: true
      }
    });

    if (!signup) {
      return NextResponse.json(
        { message: 'Signup not found' },
        { status: 404 }
      );
    }

    // Check if user has any active matchups
    const hasMatchups = signup.matchupsAsUser1.length > 0 || signup.matchupsAsUser2.length > 0;
    
    if (hasMatchups) {
      return NextResponse.json(
        { message: 'Cannot remove user with active matchups. Please delete matchups first.' },
        { status: 400 }
      );
    }

    // Delete the signup
    await prisma.contestSignup.delete({
      where: { id: signupId }
    });

    // Update the contest's totalSignups count
    await prisma.contest.update({
      where: { id: signup.contestId },
      data: {
        totalSignups: {
          decrement: 1
        }
      }
    });

    return NextResponse.json({ 
      message: 'User removed from contest successfully',
      success: true 
    });
  } catch (error) {
    console.error('Error removing signup:', error);
    return NextResponse.json(
      { message: 'Failed to remove user from contest' },
      { status: 500 }
    );
  }
}
