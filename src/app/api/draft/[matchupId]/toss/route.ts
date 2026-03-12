import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;
    const { firstPickUser, tossWinner } = await request.json();

    if (!firstPickUser || !tossWinner) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update matchup with toss result
    const updatedMatchup = await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: { 
        firstPickUser: firstPickUser // "user1" or "user2"
      }
    });

    return NextResponse.json({
      success: true,
      matchup: updatedMatchup
    });

  } catch (error) {
    console.error('Error saving toss result:', error);
    return NextResponse.json(
      { message: 'Failed to save toss result' },
      { status: 500 }
    );
  } finally {
  }
}
