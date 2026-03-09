import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { name, username, email, phone, password } = await request.json()

    // Validation
    if (!name || !email || !password || !username) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { message: "Username must be at least 3 characters" },
        { status: 400 }
      )
    }

    // Validate phone number format if provided
    if (phone) {
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { message: "Phone number must be in format 123-456-7890" },
          { status: 400 }
        )
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Check if username is taken (required field now)
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUsername) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        username: username,
        email,
        phone: phone || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        createdAt: true,
      }
    })

    return NextResponse.json(
      { 
        message: "User created successfully",
        user 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}