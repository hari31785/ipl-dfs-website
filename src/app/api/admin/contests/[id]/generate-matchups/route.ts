import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fairPairSignups } from '@/lib/matchupUtils';

// POST /api/admin/contests/[id]/generate-matchups
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if contest exists and is in correct status
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        iplGame: { select: { tournamentId: true } },
        signups: {
          include: { user: true },
          orderBy: { signupAt: 'asc' }
        },
        _count: { select: { matchups: true } }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    if (contest.status !== 'SIGNUP_CLOSED') {
      return NextResponse.json(
        { message: 'Contest must be in SIGNUP_CLOSED status to generate matchups' },
        { status: 400 }
      );
    }

    if (contest._count.matchups > 0) {
      return NextResponse.json(
        { message: 'Matchups already exist for this contest' },
        { status: 400 }
      );
    }

    const signups = contest.signups;

    if (signups.length < 2) {
      return NextResponse.json(
        { message: 'At least 2 signups required to create matchups' },
        { status: 400 }
      );
    }

    if (signups.length % 2 !== 0) {
      return NextResponse.json(
        { message: 'Even number of signups required for head-to-head matchups' },
        { status: 400 }
      );
    }

    console.log(`🔀 Generating matchups for contest ${contest.id} (fair pairing)...`);
    
    // Fair pairing: prefer opponents not yet faced in this tournament
    const tournamentId = contest.iplGame?.tournamentId ?? '';
    const pairs = await fairPairSignups(signups, tournamentId, id, prisma);
    
    // Create head-to-head matchups
    const matchups = [];
    for (const [user1, user2] of pairs) {
      const u1 = user1 as typeof signups[0];
      const u2 = user2 as typeof signups[0];
      
      console.log(`   Creating matchup: ${u1.user.username} vs ${u2.user.username}`);
      
      const matchup = await prisma.headToHeadMatchup.create({
        data: {
          contestId: contest.id,
          user1Id: u1.id,
          user2Id: u2.id,
          firstPickUser: null,
          status: 'WAITING_DRAFT'
        },
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
          }
        }
      });
      
      matchups.push(matchup);
    }

    // Update contest status to DRAFT_PHASE
    await prisma.contest.update({
      where: { id: contest.id },
      data: { status: 'DRAFT_PHASE' }
    });

    console.log(`✅ Generated ${matchups.length} head-to-head matchups for contest ${contest.id}`);

    return NextResponse.json({
      message: `Generated ${matchups.length} matchups successfully`,
      matchups: matchups
    });

  } catch (error) {
    console.error('Error generating matchups:', error);
    return NextResponse.json(
      { message: 'Failed to generate matchups' },
      { status: 500 }
    );
  }
}