import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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