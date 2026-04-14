import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/push/check — check if an endpoint is still registered server-side.
// Returns { found: true, userId } or { found: false, userId } where userId is
// looked up from localStorage (sent by client so we know whose subscription to restore).
export async function POST(request: NextRequest) {
  try {
    const { endpoint, userId } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ message: 'Missing endpoint' }, { status: 400 });
    }

    const sub = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    return NextResponse.json({ found: !!sub, userId: sub?.userId ?? userId ?? null });
  } catch (error) {
    console.error('Push check error:', error);
    return NextResponse.json({ message: 'Failed to check subscription' }, { status: 500 });
  }
}
