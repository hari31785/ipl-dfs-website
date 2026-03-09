import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        games: {
          include: {
            team1: true,
            team2: true,
            _count: {
              select: { contests: true }
            }
          }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(tournament)
  } catch (error) {
    console.error("Error fetching tournament:", error)
    return NextResponse.json(
      { message: "Failed to fetch tournament" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, startDate, endDate, isActive, status } = body

    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive,
        status
      }
    })

    return NextResponse.json(tournament)
  } catch (error) {
    console.error("Error updating tournament:", error)
    return NextResponse.json(
      { message: "Failed to update tournament" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check what's associated with this tournament
    const [gamesCount, playersCount, contestsCount] = await Promise.all([
      prisma.iPLGame.count({ where: { tournamentId: id } }),
      prisma.player.count({ where: { tournamentId: id } }),
      prisma.contest.count({ 
        where: { 
          game: { tournamentId: id } 
        } 
      })
    ])

    // If there are active contests, prevent deletion
    if (contestsCount > 0) {
      return NextResponse.json(
        { 
          message: `Cannot delete tournament: ${contestsCount} active contests found. Complete or cancel all contests first.`,
          details: { contests: contestsCount, games: gamesCount, players: playersCount }
        },
        { status: 400 }
      )
    }

    // If there are games, offer cascading delete
    if (gamesCount > 0) {
      const force = request.nextUrl.searchParams.get('force') === 'true'
      
      if (!force) {
        return NextResponse.json(
          { 
            message: `Tournament has ${gamesCount} games and ${playersCount} players. Add ?force=true to delete everything.`,
            details: { contests: contestsCount, games: gamesCount, players: playersCount },
            canForceDelete: true
          },
          { status: 400 }
        )
      }

      // Perform cascading delete
      console.log(`Force deleting tournament ${id} with ${gamesCount} games and ${playersCount} players`)
      
      // Delete in proper order to avoid foreign key constraints
      await prisma.$transaction(async (tx) => {
        // Delete contest signups for games in this tournament
        await tx.contestSignup.deleteMany({
          where: {
            contest: {
              game: { tournamentId: id }
            }
          }
        })

        // Delete contests for games in this tournament  
        await tx.contest.deleteMany({
          where: {
            game: { tournamentId: id }
          }
        })

        // Delete player stats for this tournament
        await tx.playerStat.deleteMany({
          where: {
            player: { tournamentId: id }
          }
        })

        // Delete players in this tournament
        await tx.player.deleteMany({
          where: { tournamentId: id }
        })

        // Delete games in this tournament
        await tx.iPLGame.deleteMany({
          where: { tournamentId: id }
        })

        // Finally delete the tournament
        await tx.tournament.delete({
          where: { id }
        })
      })

      return NextResponse.json({ 
        message: "Tournament and all associated data deleted successfully",
        deleted: { contests: contestsCount, games: gamesCount, players: playersCount }
      })
    }

    // Simple delete if no games
    await prisma.tournament.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Tournament deleted successfully" })
  } catch (error) {
    console.error("Error deleting tournament:", error)
    return NextResponse.json(
      { 
        message: "Failed to delete tournament",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}