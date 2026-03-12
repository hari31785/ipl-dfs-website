import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


export async function GET(request: NextRequest) {
  try {
    // First, update any expired contests to close signups
    const now = new Date();
    await prisma.contest.updateMany({
      where: {
        status: 'SIGNUP_OPEN',
        iplGame: {
          signupDeadline: {
            lte: now
          }
        }
      },
      data: {
        status: 'SIGNUP_CLOSED'
      }
    });

    // Also mark contests as completed if their game has already been played
    await prisma.contest.updateMany({
      where: {
        status: {
          not: 'COMPLETED'
        },
        iplGame: {
          gameDate: {
            lt: now
          }
        }
      },
      data: {
        status: 'COMPLETED'
      }
    });

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
      // By default, show upcoming and open games that haven't been played yet
      where.status = {
        in: ['UPCOMING', 'SIGNUP_OPEN']
      }
      where.gameDate = {
        gt: new Date()
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
          where: {
            status: 'SIGNUP_OPEN'
          },
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
  }
}
