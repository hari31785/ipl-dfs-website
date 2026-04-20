import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user - Get user by ID or username
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const username = searchParams.get('username')

    if (!id && !username) {
      return NextResponse.json(
        { error: 'User ID or username is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: id ? { id } : { username: username! },
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
        createdAt: true,
        securityQuestion1: true,
        securityQuestion2: true,
        securityQuestion3: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
