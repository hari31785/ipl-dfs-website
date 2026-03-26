import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    const {
      userId,
      securityQuestion1,
      securityAnswer1,
      securityQuestion2,
      securityAnswer2,
      securityQuestion3,
      securityAnswer3,
      password
    } = await request.json()

    if (!userId || !securityQuestion1 || !securityAnswer1 ||
        !securityQuestion2 || !securityAnswer2 ||
        !securityQuestion3 || !securityAnswer3 || !password) {
      return NextResponse.json(
        { error: 'All security questions, answers, and password are required' },
        { status: 400 }
      )
    }

    // Get user and verify password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 401 }
      )
    }

    // Hash security answers (case-insensitive)
    const hashedAnswer1 = await bcrypt.hash(securityAnswer1.toLowerCase().trim(), 12)
    const hashedAnswer2 = await bcrypt.hash(securityAnswer2.toLowerCase().trim(), 12)
    const hashedAnswer3 = await bcrypt.hash(securityAnswer3.toLowerCase().trim(), 12)

    // Update security questions and answers
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        securityQuestion1: securityQuestion1.trim(),
        securityAnswer1: hashedAnswer1,
        securityQuestion2: securityQuestion2.trim(),
        securityAnswer2: hashedAnswer2,
        securityQuestion3: securityQuestion3.trim(),
        securityAnswer3: hashedAnswer3
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        coins: true,
        securityQuestion1: true,
        securityQuestion2: true,
        securityQuestion3: true
      }
    })

    return NextResponse.json({
      message: 'Security questions updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error updating security questions:', error)
    return NextResponse.json(
      { error: 'Failed to update security questions' },
      { status: 500 }
    )
  }
}
