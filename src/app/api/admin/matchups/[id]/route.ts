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
    const { status, user1CaptainPickId, user2CaptainPickId, captainEnabled } = body;

    const matchup = await prisma.headToHeadMatchup.findUnique({ 
      where: { id },
      include: { draftPicks: true }
    });
    if (!matchup) {
      return NextResponse.json({ message: 'Matchup not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    // Handle status update
    if (status) {
      const allowedStatuses = ['WAITING_DRAFT', 'DRAFTING', 'COMPLETED'];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Handle captain picks update
    if (user1CaptainPickId !== undefined) {
      if (user1CaptainPickId !== null) {
        const pickExists = matchup.draftPicks.some(p => p.id === user1CaptainPickId && p.pickedByUserId === matchup.user1SignupId);
        if (!pickExists) {
          return NextResponse.json({ message: 'Invalid user1CaptainPickId - pick not found or not owned by user1' }, { status: 400 });
        }
      }
      updateData.user1CaptainPickId = user1CaptainPickId;
    }

    if (user2CaptainPickId !== undefined) {
      if (user2CaptainPickId !== null) {
        const pickExists = matchup.draftPicks.some(p => p.id === user2CaptainPickId && p.pickedByUserId === matchup.user2SignupId);
        if (!pickExists) {
          return NextResponse.json({ message: 'Invalid user2CaptainPickId - pick not found or not owned by user2' }, { status: 400 });
        }
      }
      updateData.user2CaptainPickId = user2CaptainPickId;
    }

    if (captainEnabled !== undefined) {
      updateData.captainEnabled = captainEnabled;
    }

    const updated = await prisma.headToHeadMatchup.update({
      where: { id },
      data: updateData,
    });

    console.log(`✅ Admin updated matchup ${id}:`, updateData);

    return NextResponse.json({ message: 'Matchup updated', matchup: updated });
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
    await prisma.$transaction(async (tx) => {
      // 1. Delete draft picks first
      if (matchup._count.draftPicks > 0) {
        await tx.draftPick.deleteMany({ where: { matchupId: id } });
        console.log(`🗑️ Deleted ${matchup._count.draftPicks} draft picks for matchup ${id}`);
      }

      // 2. Delete the matchup only — leave ContestSignup records intact so
      //    users can be re-paired. Deleting signups here causes FK violations
      //    when multi-entry users have other matchups referencing the same signup IDs.
      await tx.headToHeadMatchup.delete({ where: { id } });
    });

    console.log(`✅ Successfully deleted matchup ${id}`);

    return NextResponse.json({
      message: 'Matchup deleted successfully',
      draftPicksDeleted: matchup._count.draftPicks,
    });

  } catch (error) {
    console.error('Error deleting matchup:', error);
    return NextResponse.json(
      { message: 'Failed to delete matchup' },
      { status: 500 }
    );
  }
}
