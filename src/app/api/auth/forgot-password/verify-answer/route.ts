import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { userId, question, answer } = await request.json()

    if (!userId || !question || !answer) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find user and get security questions and answers
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        securityQuestion1: true,
        securityQuestion2: true,
        securityQuestion3: true,
        securityAnswer1: true,
        securityAnswer2: true,
        securityAnswer3: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Find which question was selected and get the corresponding answer
    let hashedAnswer: string | null = null

    if (question === user.securityQuestion1) {
      hashedAnswer = user.securityAnswer1
    } else if (question === user.securityQuestion2) {
      hashedAnswer = user.securityAnswer2
    } else if (question === user.securityQuestion3) {
      hashedAnswer = user.securityAnswer3
    }

    if (!hashedAnswer) {
      return NextResponse.json(
        { message: 'Invalid security question' },
        { status: 400 }
      )
    }

    // Compare the provided answer with the hashed answer
    // Answers are stored as hashed lowercase trimmed values
    const isMatch = await bcrypt.compare(answer.toLowerCase().trim(), hashedAnswer)

    if (!isMatch) {
      return NextResponse.json(
        { message: 'Incorrect answer' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Answer verified successfully'
    })
  } catch (error) {
    console.error('Verify answer error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : String(error))
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
