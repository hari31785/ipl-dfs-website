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
    await prisma.$disconnect()
  }
}

// Remove PUT endpoint since we're not supporting user activation/deactivation anymore