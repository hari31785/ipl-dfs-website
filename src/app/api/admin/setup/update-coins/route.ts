import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { secret, userId, coins } = await request.json()
    
    // Verify admin secret
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!userId || typeof coins !== 'number') {
      return NextResponse.json(
        { message: "User ID and coins amount required" },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { coins },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        coins: true
      }
    })

    return NextResponse.json({
      message: `Updated user coins to ${coins.toLocaleString()}`,
      user: updatedUser
    })
    
  } catch (error) {
    console.error('❌ Error updating user coins:', error)
    return NextResponse.json(
      { 
        message: "Failed to update user coins",
        error: error.message
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}