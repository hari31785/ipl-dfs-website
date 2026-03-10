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
        },
        games: {
          some: {
            status: {
              in: ['UPCOMING', 'SIGNUP_OPEN']
            },
            gameDate: {
              gte: new Date()
            },
            contests: {
              some: {}
            }
          }
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
            },
            contests: {
              some: {}
            }
          },
          orderBy: {
            gameDate: 'desc'
          },
          select: {
            id: true,
            team1Id: true,
            team2Id: true,
            gameDate: true,
            signupDeadline: true,
            status: true,
            team1: true,
            team2: true,
            contests: {
              select: {
                id: true,
                contestType: true,
                coinValue: true,
                maxParticipants: true,
                totalSignups: true,
                status: true,
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
