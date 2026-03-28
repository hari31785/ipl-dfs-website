import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/push/unsubscribe — remove a push subscription
export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ message: 'Missing endpoint' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    return NextResponse.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ message: 'Failed to remove subscription' }, { status: 500 });
  }
}
