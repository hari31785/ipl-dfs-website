import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite food?",
  "What was the name of your elementary school?",
  "What is your favorite movie?",
  "What was your childhood nickname?",
  "What is the name of the street you grew up on?",
  "What is your favorite sports team?",
  "What was the make of your first car?",
  "What is your favorite color?",
  "What is your father's middle name?",
]

export async function POST(request: Request) {
  try {
    const { emailOrUsername } = await request.json()

    if (!emailOrUsername) {
      return NextResponse.json(
        { message: 'Email or username is required' },
        { status: 400 }
      )
    }

    // Find user by email or username
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.trim() },
          { username: emailOrUsername.trim() }
        ]
      },
      select: {
        id: true,
        securityQuestion1: true,
        securityQuestion2: true,
        securityQuestion3: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has security questions set up
    if (!user.securityQuestion1 || !user.securityQuestion2 || !user.securityQuestion3) {
      // Auto-assign 3 random security questions with answer "test"
      const shuffledQuestions = [...SECURITY_QUESTIONS].sort(() => Math.random() - 0.5)
      const selectedQuestions = shuffledQuestions.slice(0, 3)
      
      // Hash the answer "test" (lowercase and trimmed as per the signup flow)
      const hashedAnswer = await bcrypt.hash("test", 12)
      
      // Update the user with the security questions
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          securityQuestion1: selectedQuestions[0],
          securityAnswer1: hashedAnswer,
          securityQuestion2: selectedQuestions[1],
          securityAnswer2: hashedAnswer,
          securityQuestion3: selectedQuestions[2],
          securityAnswer3: hashedAnswer,
        },
        select: {
          id: true,
          securityQuestion1: true,
          securityQuestion2: true,
          securityQuestion3: true,
        }
      })
      
      console.log(`Auto-assigned security questions for user ${user.id}`)
    }

    // Return the security questions (not answers!)
    const questions = [
      { question: user.securityQuestion1 },
      { question: user.securityQuestion2 },
      { question: user.securityQuestion3 }
    ]

    return NextResponse.json({
      userId: user.id,
      questions
    })
  } catch (error) {
    console.error('Verify user error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : String(error))
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
