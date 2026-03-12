import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// PUT /api/admin/contests/[id] - Update contest status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['SIGNUP_OPEN', 'SIGNUP_CLOSED', 'DRAFT_PHASE', 'LIVE', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    const contest = await prisma.contest.update({
      where: { id },
      data: { status },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        }
      }
    });

    return NextResponse.json(contest);
  } catch (error) {
    console.error('Error updating contest:', error);
    return NextResponse.json(
      { message: 'Failed to update contest' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/contests/[id] - Delete contest
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if contest exists and has any signups
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            signups: true,
            matchups: true
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

    // Prevent deletion if contest has signups or matchups
    if (contest._count.signups > 0 || contest._count.matchups > 0) {
      return NextResponse.json(
        { message: 'Cannot delete contest with existing signups or matchups' },
        { status: 400 }
      );
    }

    await prisma.contest.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json(
      { message: 'Failed to delete contest' },
      { status: 500 }
    );
  }
}