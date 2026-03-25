import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/contests/[id]/signups - Get all signups for a contest
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const signups = await prisma.contestSignup.findMany({
      where: {
        contestId: id
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            coins: true
          }
        },
        matchup1: {
          select: {
            id: true,
            status: true,
            user1Score: true,
            user2Score: true,
            winnerId: true
          }
        },
        matchup2: {
          select: {
            id: true,
            status: true,
            user1Score: true,
            user2Score: true,
            winnerId: true
          }
        }
      },
      orderBy: {
        signupAt: 'asc'
      }
    });

    return NextResponse.json({ signups });
  } catch (error) {
    console.error('Error fetching contest signups:', error);
    return NextResponse.json(
      { message: 'Failed to fetch contest signups' },
      { status: 500 }
    );
  }
}
