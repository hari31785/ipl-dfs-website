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

// PATCH /api/admin/matchups/[id]/picks - Replace a single draft pick
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;
    const { pickId, newPlayerId } = await request.json();

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
