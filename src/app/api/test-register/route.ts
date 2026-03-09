import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

export async function POST(request: NextRequest) {
  const prisma = new PrismaClient()
  
  try {
    const { name, username, email, phone, password } = await request.json()

    console.log('Test registration attempt for:', { username, email, name })

    // Basic validation
    if (!name || !email || !password || !username) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Test database connection
    console.log('Testing database connection...')
    const userCount = await prisma.user.count()
    console.log('Current user count:', userCount)

    return NextResponse.json({
      message: "Database connection test successful",
      userCount,
      receivedData: { name, username, email, phone: phone || null }
    })

  } catch (error) {
    console.error("Test registration error:", error)
    return NextResponse.json(
      { 
        message: "Database connection test failed",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace"
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}