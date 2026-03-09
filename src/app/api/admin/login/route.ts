import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      )
    }

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { username }
    })

    if (!admin) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, admin.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Return admin data (without password)
    const { password: _, ...adminData } = admin

    return NextResponse.json({
      message: "Login successful",
      admin: adminData
    })

  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}