import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/admin/users/[id]/reset-password - Set a temporary password for a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { temporaryPassword } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!temporaryPassword || temporaryPassword.length < 6) {
      return NextResponse.json(
        { message: 'Temporary password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return NextResponse.json({
      message: 'Password reset successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name
      },
      temporaryPassword
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { 
        message: 'Failed to reset password',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
