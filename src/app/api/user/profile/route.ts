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
