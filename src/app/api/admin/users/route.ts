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

    // Add isActive as true for all users for now (until migration runs)
    const usersWithStatus = users.map(user => ({
      ...user,
      isActive: true
    }))

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
    return NextResponse.json({ 
      message: "User status management will be available after database migration",
    }, { status: 501 })
    
    // TODO: Enable after migration
    /*
    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: "User ID and isActive status are required" },
        { status: 400 }
      )
    }

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
    */
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