import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

export async function GET(request: NextRequest) {
  const prisma = new PrismaClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    console.log('Username check request for:', username)

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json({
        available: false,
        message: "Username must be at least 3 characters"
      })
    }

    // Check if username exists in database
    console.log('Checking username in database...')
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true }
    })

    console.log('Database result:', existingUser ? 'User found' : 'User not found')

    const isAvailable = !existingUser
    
    return NextResponse.json({
      available: isAvailable,
      message: existingUser ? "Username is already taken" : "Username is available"
    })

  } catch (error) {
    console.error("Username check error:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  } finally {
  }
}