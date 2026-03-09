import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

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
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    return NextResponse.json({
      available: !existingUser,
      message: existingUser ? "Username is already taken" : "Username is available"
    })

  } catch (error) {
    console.error("Username check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}