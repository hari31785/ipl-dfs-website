import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/push/subscribe — save a push subscription for a user
export async function POST(request: NextRequest) {
  try {
    const { userId, subscription } = await request.json();

    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Remove all previous subscriptions for this user except the new endpoint,
    // then upsert the new one. This prevents duplicate delivery when iOS rotates
    // the push key and the auto-resubscribe creates a new endpoint each time.
    await prisma.$transaction([
      prisma.pushSubscription.deleteMany({
        where: { userId, endpoint: { not: subscription.endpoint } },
      }),
      prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        update: {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      }),
    ]);

    return NextResponse.json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ message: 'Failed to save subscription' }, { status: 500 });
  }
}
