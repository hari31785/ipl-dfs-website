import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/health — lightweight DB connectivity check
// Returns 200 { ok: true } if DB is reachable, 503 { ok: false } otherwise.
// Used by the client-side DbStatusBanner to detect outages.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Database unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
