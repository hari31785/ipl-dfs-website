import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// POST /api/admin/contests/[id]/reopen-signups
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newDeadline } = body;

    if (!newDeadline) {
      return NextResponse.json(
        { message: 'New signup deadline is required' },
        { status: 400 }
      );
    }

    const deadlineDate = new Date(newDeadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return NextResponse.json(
        { message: 'Deadline must be a valid date in the future' },
        { status: 400 }
      );
    }

    const contest = await prisma.contest.findUnique({
      where: { id },
      select: { id: true, iplGameId: true, status: true }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    // Extend the signup deadline on the game AND reopen the contest atomically
    await prisma.$transaction([
      prisma.iPLGame.update({
        where: { id: contest.iplGameId },
        data: { signupDeadline: deadlineDate }
      }),
      prisma.contest.update({
        where: { id },
        data: { status: 'SIGNUP_OPEN' }
      })
    ]);

    const updatedContest = await prisma.contest.findUnique({
      where: { id },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        },
        _count: {
          select: {
            signups: true,
            matchups: true
          }
        }
      }
    });

    console.log(`✅ Reopened signups for contest ${id} — new deadline: ${deadlineDate.toISOString()}`);

    return NextResponse.json({
      message: `Signups reopened! New deadline: ${deadlineDate.toLocaleString()}`,
      contest: updatedContest
    });

  } catch (error) {
    console.error('Error reopening signups:', error);
    return NextResponse.json(
      { message: 'Failed to reopen signups' },
      { status: 500 }
    );
  }
}
