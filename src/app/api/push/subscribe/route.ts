import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/push/subscribe — save a push subscription for a user
export async function POST(request: NextRequest) {
  try {
    const { userId, subscription } = await request.json();

    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Upsert the subscription — preserves all other device subscriptions for
    // this user. Expired/invalid endpoints are cleaned up naturally when
    // sendToUser/sendToAll receives a 404/410 from the push service.
    await prisma.pushSubscription.upsert({
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
    });


    return NextResponse.json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ message: 'Failed to save subscription' }, { status: 500 });
  }
}
