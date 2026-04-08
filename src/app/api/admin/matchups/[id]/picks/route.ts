import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/matchups/[id]/picks - Get all picks + available players for a matchup
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;

    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        contest: {
          include: {
            iplGame: {
              include: { team1: true, team2: true }
            }
          }
        },
        draftPicks: {
          include: {
            player: { include: { iplTeam: true } }
          },
          orderBy: { pickOrder: 'asc' }
        },
        user1: { include: { user: true } },
        user2: { include: { user: true } },
      }
    });

    if (!matchup) {
      return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });
    }

    const { team1Id, team2Id } = matchup.contest.iplGame;

    // Get all players from both teams in this game
    const allPlayers = await prisma.player.findMany({
      where: { iplTeamId: { in: [team1Id, team2Id] }, isActive: true },
      include: { iplTeam: true },
      orderBy: [{ iplTeamId: 'asc' }, { name: 'asc' }]
    });

    return NextResponse.json({ matchup, allPlayers });
  } catch (error) {
    console.error('Error fetching matchup picks:', error);
    return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 });
  }
}

// PATCH /api/admin/matchups/[id]/picks - Replace player, update isBench, or swap bench priority
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;
    const body = await request.json();
    const { pickId, newPlayerId, isBench, swapPickOrders } = body;

    // Operation: swap pickOrders between two bench picks (bench priority reorder)
    if (swapPickOrders && Array.isArray(swapPickOrders) && swapPickOrders.length === 2) {
      const [id1, id2] = swapPickOrders as [string, string];
      const [pick1, pick2] = await Promise.all([
        prisma.draftPick.findUnique({ where: { id: id1 } }),
        prisma.draftPick.findUnique({ where: { id: id2 } }),
      ]);
      if (!pick1 || !pick2 || pick1.matchupId !== matchupId || pick2.matchupId !== matchupId) {
        return NextResponse.json({ error: 'Pick(s) not found in this matchup' }, { status: 404 });
      }
      // Swap using -999 as temp to avoid unique constraint violation
      await prisma.$transaction([
        prisma.draftPick.update({ where: { id: id1 }, data: { pickOrder: -999 } }),
        prisma.draftPick.update({ where: { id: id2 }, data: { pickOrder: pick1.pickOrder } }),
        prisma.draftPick.update({ where: { id: id1 }, data: { pickOrder: pick2.pickOrder } }),
      ]);
      console.log(`🔄 Admin swapped bench priority picks ${id1} ↔ ${id2} in matchup ${matchupId}`);
      return NextResponse.json({ message: 'Bench priority swapped' });
    }

    // Operation: update isBench status on a pick
    if (pickId && typeof isBench === 'boolean') {
      const pick = await prisma.draftPick.findUnique({ where: { id: pickId } });
      if (!pick || pick.matchupId !== matchupId) {
        return NextResponse.json({ error: 'Pick not found in this matchup' }, { status: 404 });
      }
      const updated = await prisma.draftPick.update({ where: { id: pickId }, data: { isBench } });
      console.log(`⭐ Admin set pick ${pickId} isBench=${isBench} in matchup ${matchupId}`);
      return NextResponse.json({ pick: updated, message: `Pick isBench set to ${isBench}` });
    }

    if (!pickId || !newPlayerId) {
      return NextResponse.json({ error: 'pickId and newPlayerId are required' }, { status: 400 });
    }

    // Fetch the matchup with picks and game teams
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        contest: { include: { iplGame: true } },
        draftPicks: true,
      }
    });

    if (!matchup) {
      return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });
    }

    // Validate pick belongs to this matchup
    const pick = matchup.draftPicks.find(p => p.id === pickId);
    if (!pick) {
      return NextResponse.json({ error: 'Pick not found in this matchup' }, { status: 404 });
    }

    // Validate new player is from one of the two game teams
    const { team1Id, team2Id } = matchup.contest.iplGame;
    const newPlayer = await prisma.player.findUnique({
      where: { id: newPlayerId },
      include: { iplTeam: true }
    });

    if (!newPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (newPlayer.iplTeamId !== team1Id && newPlayer.iplTeamId !== team2Id) {
      return NextResponse.json({ error: 'Player is not from either team in this game' }, { status: 400 });
    }

    // Validate new player not already picked by someone else in this matchup
    const alreadyPicked = matchup.draftPicks.some(p => p.id !== pickId && p.playerId === newPlayerId);
    if (alreadyPicked) {
      return NextResponse.json({ error: `${newPlayer.name} is already picked in this matchup` }, { status: 400 });
    }

    // Update the pick
    const updated = await prisma.draftPick.update({
      where: { id: pickId },
      data: { playerId: newPlayerId },
      include: { player: { include: { iplTeam: true } } }
    });

    console.log(`✅ Admin replaced pick #${pick.pickOrder} in matchup ${matchupId}: → ${newPlayer.name}`);

    return NextResponse.json({ pick: updated, message: `Pick #${pick.pickOrder} updated to ${newPlayer.name}` });
  } catch (error) {
    console.error('Error updating pick:', error);
    return NextResponse.json({ error: 'Failed to update pick' }, { status: 500 });
  }
}

// DELETE /api/admin/matchups/[id]/picks - Delete a single draft pick
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;
    const { pickId } = await request.json();

    if (!pickId) {
      return NextResponse.json({ error: 'pickId is required' }, { status: 400 });
    }

    // Verify the pick belongs to this matchup
    const pick = await prisma.draftPick.findUnique({
      where: { id: pickId },
      include: { player: true }
    });

    if (!pick || pick.matchupId !== matchupId) {
      return NextResponse.json({ error: 'Pick not found in this matchup' }, { status: 404 });
    }

    await prisma.draftPick.delete({ where: { id: pickId } });

    console.log(`🗑️ Admin deleted pick #${pick.pickOrder} (${pick.player.name}) from matchup ${matchupId}`);

    return NextResponse.json({ message: `Pick #${pick.pickOrder} (${pick.player.name}) deleted` });
  } catch (error) {
    console.error('Error deleting pick:', error);
    return NextResponse.json({ error: 'Failed to delete pick' }, { status: 500 });
  }
}
