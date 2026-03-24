import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    // Get all the counts in parallel
    const [
      totalUsers,
      totalPlayers,
      totalTeams,
      activeContests,
      pendingMessages
    ] = await Promise.all([
      prisma.user.count(),
      prisma.player.count(),
      prisma.iPLTeam.count(),
      prisma.contest.count({
        where: {
          status: {
            in: ['UPCOMING', 'LIVE', 'SIGNUP_OPEN', 'SIGNUP_CLOSED', 'DRAFTING']
          }
        }
      }),
      prisma.message.count({
        where: {
          status: 'PENDING'
        }
      })
    ]);

    const stats = {
      totalUsers,
      totalPlayers,
      totalTeams,
      activeContests,
      pendingMessages
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}