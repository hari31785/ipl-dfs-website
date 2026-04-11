import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/matchups/[id] - Update a matchup (e.g. mark as COMPLETED)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const allowedStatuses = ['WAITING_DRAFT', 'DRAFTING', 'COMPLETED'];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const matchup = await prisma.headToHeadMatchup.findUnique({ where: { id } });
    if (!matchup) {
      return NextResponse.json({ message: 'Matchup not found' }, { status: 404 });
    }

    const updated = await prisma.headToHeadMatchup.update({
      where: { id },
      data: { status },
    });

    console.log(`✅ Admin manually set matchup ${id} status → ${status}`);

    return NextResponse.json({ message: 'Matchup status updated', matchup: updated });
  } catch (error) {
    console.error('Error updating matchup status:', error);
    return NextResponse.json({ message: 'Failed to update matchup status' }, { status: 500 });
  }
}

// DELETE /api/admin/matchups/[id] - Delete a matchup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the matchup with draft picks and both users' profiles
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id },
      include: {
        draftPicks: true,
        user1: { select: { userId: true } },
        user2: { select: { userId: true } },
        _count: {
          select: {
            draftPicks: true
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

    // Don't allow deletion of completed matchups
    if (matchup.status === 'COMPLETED') {
      return NextResponse.json(
        { message: 'Cannot delete completed matchup. Draft has finished.' },
        { status: 400 }
      );
    }

    // Delete all draft picks first (if any)
    if (matchup._count.draftPicks > 0) {
      await prisma.draftPick.deleteMany({
        where: { matchupId: id }
      });
      console.log(`🗑️ Deleted ${matchup._count.draftPicks} draft picks for matchup ${id}`);
    }

    // Delete the matchup
    await prisma.headToHeadMatchup.delete({
      where: { id }
    });

    // Remove contest signups for both users so they no longer see this contest
    // in their dashboard (stale signup with no matchup would show as a ghost entry)
    const affectedUserIds = [matchup.user1.userId, matchup.user2.userId];
    const { count: signupsDeleted } = await prisma.contestSignup.deleteMany({
      where: {
        contestId: matchup.contestId,
        userId: { in: affectedUserIds },
      },
    });

    console.log(`✅ Successfully deleted matchup ${id}, ${signupsDeleted} signup(s) cleaned up`);

    return NextResponse.json({
      message: 'Matchup deleted successfully',
      draftPicksDeleted: matchup._count.draftPicks,
      signupsRemoved: signupsDeleted,
    });

  } catch (error) {
    console.error('Error deleting matchup:', error);
    return NextResponse.json(
      { message: 'Failed to delete matchup' },
      { status: 500 }
    );
  }
}
