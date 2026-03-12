import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        password: true, // Include password for admin access
        coins: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            contestSignups: true,
            coinTransactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // All users are considered active by default
    const usersWithStatus = users.map(user => ({
      ...user,
      isActive: true, // For backward compatibility with frontend
    }))

    return NextResponse.json({ users: usersWithStatus })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    )
  } finally {
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Delete user and all related data
    await prisma.$transaction(async (tx) => {
      // Delete related data first
      await tx.coinTransaction.deleteMany({
        where: { userId }
      })
      await tx.contestSignup.deleteMany({
        where: { userId }
      })
      await tx.contestEntry.deleteMany({
        where: { userId }
      })
      await tx.team.deleteMany({
        where: { userId }
      })
      
      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      })
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { message: "Failed to delete user" },
      { status: 500 }
    )
  } finally {
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, action } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    if (action === 'getPassword') {
      // Retrieve user password for admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, username: true }
      })

      if (!user) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        )
      }

      return NextResponse.json({ 
        password: user.password,
        username: user.username
      })
    }

    return NextResponse.json(
      { message: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error processing user request:", error)
    return NextResponse.json(
      { message: "Failed to process request" },
      { status: 500 }
    )
  } finally {
  }
}