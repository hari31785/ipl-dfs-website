import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        signups: {
          include: {
            user: true
          }
        },
        _count: {
          select: {
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

    // Shuffle signups using Fisher-Yates algorithm for true randomization
    const shuffledSignups = [...signups];
    for (let i = shuffledSignups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSignups[i], shuffledSignups[j]] = [shuffledSignups[j], shuffledSignups[i]];
    }
    
    // Create head-to-head matchups
    const matchups = [];
    for (let i = 0; i < shuffledSignups.length; i += 2) {
      const user1 = shuffledSignups[i];
      const user2 = shuffledSignups[i + 1];
      
      // Randomly decide who picks first
      const firstPickUser = Math.random() < 0.5 ? 'user1' : 'user2';
      
      const matchup = await prisma.headToHeadMatchup.create({
        data: {
          contestId: contest.id,
          user1Id: user1.id,
          user2Id: user2.id,
          firstPickUser: firstPickUser,
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