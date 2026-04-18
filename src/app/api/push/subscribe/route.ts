import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/push/subscribe — save a push subscription for a user
export async function POST(request: NextRequest) {
  try {
    const { userId, subscription, previousEndpoint } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // userId may be null when called from the SW pushsubscriptionchange handler
    // (app is killed — no localStorage access). In that case, look up the userId
    // from the old endpoint row so we can carry it over to the new subscription.
    let resolvedUserId = userId;
    if (!resolvedUserId && previousEndpoint) {
      const old = await prisma.pushSubscription.findUnique({ where: { endpoint: previousEndpoint } });
      resolvedUserId = old?.userId ?? null;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // If this device previously had a different endpoint (e.g. iOS rotated it),
      // delete the old one so we don't accumulate duplicates for the same device.
      // previousEndpoint comes from localStorage on the client — it is per-device
      // so deleting it won't affect other devices.
      if (previousEndpoint && previousEndpoint !== subscription.endpoint) {
        await tx.pushSubscription.deleteMany({ where: { endpoint: previousEndpoint } });
      }

      // Upsert the new endpoint — preserves subscriptions from other devices.
      await tx.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        create: {
          userId: resolvedUserId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        update: {
          userId: resolvedUserId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
    });


    return NextResponse.json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ message: 'Failed to save subscription' }, { status: 500 });
  }
}
