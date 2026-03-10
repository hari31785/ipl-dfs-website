import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/users/search - Search for active users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get all active users, optionally filtered by search query
    const users = await prisma.user.findMany({
      where: query ? {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      } : undefined,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        totalWins: true,
        totalMatches: true
      },
      orderBy: {
        name: 'asc'
      },
      take: 50 // Limit results
    });

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { message: 'Failed to search users', error: String(error) },
      { status: 500 }
    );
  }
}
