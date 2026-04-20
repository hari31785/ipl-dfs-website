import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/draft/[matchupId]/poll - Lightweight poll: only returns fields that change during a draft
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params;

    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      select: {
        status: true,
        firstPickUser: true,
        draftPicks: {
          select: {
            id: true,
            pickOrder: true,
            pickedByUserId: true,
            isBench: true,
            playerId: true,
            player: {
              include: {
                iplTeam: true
              }
            }
          },
          orderBy: { pickOrder: 'asc' }
        }
      }
    });

    if (!matchup) {
      return NextResponse.json({ message: 'Matchup not found' }, { status: 404 });
    }

    return NextResponse.json(matchup);
  } catch (error) {
    console.error('Error fetching draft poll:', error);
    return NextResponse.json(
      { message: 'Failed to fetch draft poll', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
