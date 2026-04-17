import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/contests/[id]/signups - Get all signups for a contest
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get contest details with game info
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true,
            tournament: true
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
        // entryNumber is included via the model field automatically
        matchupsAsUser1: {
          select: {
            id: true,
            status: true,
            user1Score: true,
            user2Score: true,
            winnerId: true
          }
        },
        matchupsAsUser2: {
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

    return NextResponse.json({ 
      signups,
      contest: {
        id: contest.id,
        contestType: contest.contestType,
        coinValue: contest.coinValue,
        status: contest.status
      },
      game: contest.iplGame
    });
  } catch (error) {
    console.error('Error fetching contest signups:', error);
    return NextResponse.json(
      { message: 'Failed to fetch contest signups' },
      { status: 500 }
    );
  }
}

// POST /api/admin/contests/[id]/signups - Add a user to the contest by username
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ message: 'Username is required' }, { status: 400 });
    }

    const contest = await prisma.contest.findUnique({ where: { id } });
    if (!contest) {
      return NextResponse.json({ message: 'Contest not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user) {
      return NextResponse.json({ message: `User "${username}" not found` }, { status: 404 });
    }

    // Determine entry number (allow multi-entry)
    const existingEntries = await prisma.contestSignup.count({
      where: { contestId: id, userId: user.id }
    });
    const entryNumber = existingEntries + 1;

    const signup = await prisma.contestSignup.create({
      data: {
        contestId: id,
        userId: user.id,
        entryNumber,
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, email: true, coins: true }
        },
        matchupsAsUser1: { select: { id: true, status: true, user1Score: true, user2Score: true, winnerId: true } },
        matchupsAsUser2: { select: { id: true, status: true, user1Score: true, user2Score: true, winnerId: true } },
      }
    });

    return NextResponse.json({ signup }, { status: 201 });
  } catch (error) {
    console.error('Error adding user to contest:', error);
    return NextResponse.json({ message: 'Failed to add user to contest' }, { status: 500 });
  }
}
