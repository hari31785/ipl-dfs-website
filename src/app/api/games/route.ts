import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tournamentId = searchParams.get('tournamentId')
    const status = searchParams.get('status')

    const where: any = {}

    if (tournamentId) {
      where.tournamentId = tournamentId
    }

    if (status) {
      where.status = status
    } else {
      // By default, show upcoming and open games
      where.status = {
        in: ['UPCOMING', 'SIGNUP_OPEN']
      }
    }

    const games = await prisma.iPLGame.findMany({
      where,
      orderBy: {
        gameDate: 'asc'
      },
      include: {
        tournament: true,
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
    })

    return NextResponse.json(games)
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
