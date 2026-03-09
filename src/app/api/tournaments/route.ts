import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: {
        isActive: true,
        status: {
          in: ['ACTIVE', 'UPCOMING']
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      include: {
        games: {
          where: {
            status: {
              in: ['UPCOMING', 'SIGNUP_OPEN']
            },
            gameDate: {
              gte: new Date()
            }
          },
          orderBy: {
            gameDate: 'desc'
          },
          include: {
            team1: true,
            team2: true,
            contests: {
              include: {
                _count: {
                  select: {
                    signups: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
