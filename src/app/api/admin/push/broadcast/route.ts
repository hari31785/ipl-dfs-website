import { NextRequest, NextResponse } from 'next/server';
import { sendToAll, sendToUser } from '@/lib/pushNotifications';

// POST /api/admin/push/broadcast — send a push notification to all or specific users
export async function POST(request: NextRequest) {
  try {
    const { title, body, url, userIds } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ message: 'title and body are required' }, { status: 400 });
    }

    const payload = {
      title,
      body,
      icon: '/icon-192.png',
      url: url || '/dashboard',
    };

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
