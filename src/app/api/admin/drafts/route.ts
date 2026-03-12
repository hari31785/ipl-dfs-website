import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// GET /api/admin/drafts - Get draft details for a contest
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get('contestId');

    if (!contestId) {
      return NextResponse.json(
        { message: 'Contest ID is required' },
        { status: 400 }
      );
    }

    const matchups = await prisma.headToHeadMatchup.findMany({
      where: {
        contestId: contestId
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
        },
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true
              }
            }
          }
        },
        draftPicks: {
          include: {
            player: {
              include: {
                iplTeam: true
              }
            }
          },
          orderBy: {
            pickOrder: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(matchups);
  } catch (error) {
    console.error('Error fetching draft details:', error);
    return NextResponse.json(
      { message: 'Failed to fetch draft details' },
      { status: 500 }
    );
  }
}