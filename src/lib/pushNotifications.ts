import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Configure VAPID details once
webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string; // URL to open when notification is clicked
}

/**
 * Send a push notification to a single user (all their subscriptions).
 * Silently removes expired/invalid subscriptions.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404 / 410 = subscription expired — remove it
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        } else {
          console.error(`Push failed for user ${userId}:`, err);
        }
      }
    })
  );
}

/**
 * Broadcast a push notification to ALL subscribed users.
 */
export async function sendToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany();

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
        failed++;
      }
    })
  );

  return { sent, failed };
}
