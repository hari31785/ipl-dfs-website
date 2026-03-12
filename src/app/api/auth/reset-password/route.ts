import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { emailOrUsername } = await request.json()

    if (!emailOrUsername) {
      return NextResponse.json(
        { message: "Email or username is required" },
        { status: 400 }
      )
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        name: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found with that email or username" },
        { status: 404 }
      )
    }

    // For simplicity, we'll return the password directly
    // In a real app, you'd send an email with a reset link
    return NextResponse.json({
      message: "Password retrieved successfully",
      username: user.username,
      password: user.password,
      name: user.name
    })

  } catch (error) {
    console.error("Error retrieving password:", error)
    return NextResponse.json(
      { message: "Failed to retrieve password" },
      { status: 500 }
    )
  } finally {
  }
}