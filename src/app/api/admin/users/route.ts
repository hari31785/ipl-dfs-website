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

    // Try to get isActive field if it exists, otherwise default to true
    let usersWithStatus;
    try {
      const usersWithActive = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          phone: true,
          coins: true,
          isActive: true,
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
      usersWithStatus = usersWithActive;
    } catch (error) {
      // If isActive field doesn't exist yet, add it manually
      usersWithStatus = users.map(user => ({
        ...user,
        isActive: true
      }))
    }

    return NextResponse.json({ users: usersWithStatus })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: "User ID and isActive status are required" },
        { status: 400 }
      )
    }

    // Try to update with isActive field
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          username: true,
          name: true,
          isActive: true
        }
      })

      return NextResponse.json({ 
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: updatedUser 
      })
    } catch (error) {
      // If isActive field doesn't exist, return a message
      return NextResponse.json({ 
        message: "User status management requires database migration",
      }, { status: 501 })
    }
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}