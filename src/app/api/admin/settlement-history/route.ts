import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tournamentId = searchParams.get('tournamentId');

    // Query settlement history
    const settlements = await prisma.$queryRaw<any[]>`
      SELECT 
        s.*,
        u.name as "userName",
        u.username,
        t.name as "tournamentName"
      FROM settlements s
      JOIN "users" u ON s."userId" = u.id
      JOIN "tournaments" t ON s."tournamentId" = t.id
      WHERE 
        ${userId ? `s."userId" = ${userId}` : 'TRUE'}
        AND ${tournamentId ? `s."tournamentId" = ${tournamentId}` : 'TRUE'}
      ORDER BY s."createdAt" DESC
      LIMIT 100
    `.catch(() => []) as any[];

    return NextResponse.json({
      success: true,
      settlements,
      total: settlements.length,
    });

  } catch (error) {
    console.error('Error fetching settlement history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settlement history' },
      { status: 500 }
    );
  }
}
