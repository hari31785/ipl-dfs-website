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

    // Get the matchup with draft pick count
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { draftPicks: true }
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

    // Run everything in a transaction so partial failures don't leave orphaned data
    const signupsDeleted = await prisma.$transaction(async (tx) => {
      // 1. Delete draft picks first
      if (matchup._count.draftPicks > 0) {
        await tx.draftPick.deleteMany({ where: { matchupId: id } });
        console.log(`🗑️ Deleted ${matchup._count.draftPicks} draft picks for matchup ${id}`);
      }

      // 2. Delete the matchup
      await tx.headToHeadMatchup.delete({ where: { id } });

      // 3. Delete only the specific ContestSignup records referenced by this matchup.
      //    Using user1Id/user2Id (the ContestSignup PKs) avoids accidentally deleting
      //    other signups the same user may have in the same contest, which would cause
      //    an FK violation on any other matchup that references those signup rows.
      const { count } = await tx.contestSignup.deleteMany({
        where: { id: { in: [matchup.user1Id, matchup.user2Id] } },
      });
      return count;
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
