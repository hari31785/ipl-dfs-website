import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst()
    if (existingAdmin) {
      return NextResponse.json(
        { message: "Admin already exists" },
        { status: 400 }
      )
    }

    // Create default admin (username: admin, password: admin123)
    const hashedPassword = await bcrypt.hash("admin123", 12)
    
    const admin = await prisma.admin.create({
      data: {
        username: "admin",
        password: hashedPassword,
        name: "IPL DFS Admin"
      }
    })

    return NextResponse.json({
      message: "Admin created successfully",
      username: "admin",
      password: "admin123"
    })

  } catch (error) {
    console.error("Admin setup error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}