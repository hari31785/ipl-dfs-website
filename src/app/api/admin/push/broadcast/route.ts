import { NextRequest, NextResponse } from 'next/server';
import { sendToAll, sendToUser } from '@/lib/pushNotifications';
import { prisma } from '@/lib/prisma';

// GET /api/admin/push/broadcast — subscription stats for the admin panel
export async function GET() {
  const [totalUsers, subs] = await Promise.all([
    prisma.user.count(),
    prisma.pushSubscription.findMany({ select: { userId: true } }),
  ]);
  const subscribedUserIds = new Set(subs.map(s => s.userId));
  return NextResponse.json({
    totalUsers,
    subscribedUsers: subscribedUserIds.size,
    totalDevices: subs.length,
    unsubscribedUsers: totalUsers - subscribedUserIds.size,
  });
}

// POST /api/admin/push/broadcast — send a push notification to all or specific users
export async function POST(request: NextRequest) {
  try {
    const { title, body, url, userIds, activeDraftsOnly } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ message: 'title and body are required' }, { status: 400 });
    }

    const payload = {
      title,
      body,
      icon: '/icon-192.png',
      url: url || '/dashboard',
    };

    // Active drafts send: find all users in DRAFTING matchups
    if (activeDraftsOnly) {
      const activeDraftMatchups = await prisma.headToHeadMatchup.findMany({
        where: { status: 'DRAFTING' },
        include: {
          user1: { include: { user: true } },
          user2: { include: { user: true } },
        },
      });
      // Collect unique user IDs from both sides of every active draft
      const uniqueUserIds = [...new Set(
        activeDraftMatchups.flatMap(m => [m.user1.user.id, m.user2.user.id])
      )];
      if (uniqueUserIds.length === 0) {
        return NextResponse.json({ message: 'No active drafts found', sent: 0, failed: 0 });
      }
      let sent = 0;
      let failed = 0;
      for (const userId of uniqueUserIds) {
        try {
          await sendToUser(userId, payload);
          sent++;
        } catch {
          failed++;
        }
      }
      return NextResponse.json({ message: 'Active drafts send complete', sent, failed });
    }

    // Targeted send: specific user IDs provided
    if (Array.isArray(userIds) && userIds.length > 0) {
      let sent = 0;
      let failed = 0;
      for (const userId of userIds) {
        try {
          await sendToUser(userId, payload);
          sent++;
        } catch {
          failed++;
        }
      }
      return NextResponse.json({ message: 'Targeted send complete', sent, failed });
    }

    // Broadcast to all
    const result = await sendToAll(payload);
    return NextResponse.json({ message: 'Broadcast sent', ...result });
  } catch (error) {
    console.error('Push broadcast error:', error);
    return NextResponse.json({ message: 'Failed to send broadcast' }, { status: 500 });
  }
}
