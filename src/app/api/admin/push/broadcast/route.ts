import { NextRequest, NextResponse } from 'next/server';
import { sendToAll } from '@/lib/pushNotifications';

// POST /api/admin/push/broadcast — send a push notification to all subscribed users
export async function POST(request: NextRequest) {
  try {
    const { title, body, url } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ message: 'title and body are required' }, { status: 400 });
    }

    const result = await sendToAll({
      title,
      body,
      icon: '/icon-192.png',
      url: url || '/dashboard',
    });

    return NextResponse.json({ message: 'Broadcast sent', ...result });
  } catch (error) {
    console.error('Push broadcast error:', error);
    return NextResponse.json({ message: 'Failed to send broadcast' }, { status: 500 });
  }
}
