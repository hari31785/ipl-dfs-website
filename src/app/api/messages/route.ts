import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Submit a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, userId } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        userId: userId || null,
        name,
        email,
        subject,
        message,
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Get all messages (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const messages = await prisma.message.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
