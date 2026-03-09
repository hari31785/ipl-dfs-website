import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

export async function POST(request: NextRequest) {
  const prisma = new PrismaClient()
  
  try {
    const { name, username, email, phone, password } = await request.json()

    console.log('Registration attempt for:', { username, email, name })

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

    console.log('Checking for existing user...')

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })

    if (existingUser) {
      console.log('Email already exists:', email)
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    console.log('Checking for existing username...')

    // Check if username is taken (required field now)
    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true }
    })

    if (existingUsername) {
      console.log('Username already exists:', username)
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      )
    }

    console.log('Creating new user...')

    // Use plaintext password temporarily to avoid bcrypt issues
    // TODO: Re-enable bcrypt hashing after testing
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        username: username,
        email,
        phone: phone || null,
        password: password, // Temporarily storing plaintext - SECURITY RISK
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

    console.log('User created successfully:', user.id)

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
      { 
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}