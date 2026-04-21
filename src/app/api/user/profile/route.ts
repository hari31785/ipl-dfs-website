import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, phone } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        phone: phone && phone.trim() ? phone.trim() : null
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        totalWins: true,
        totalMatches: true,
        winPercentage: true,
        coins: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/profile - Change username
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username } = body;

    if (!userId || !username) {
      return NextResponse.json({ error: 'User ID and username are required' }, { status: 400 });
    }

    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      return NextResponse.json({ error: '3-20 chars, letters/numbers/underscores only' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: clean } });
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username: clean },
      select: { id: true, username: true }
    });

    return NextResponse.json({ message: 'Username updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error changing username:', error);
    return NextResponse.json({ error: 'Failed to change username' }, { status: 500 });
  }
}
