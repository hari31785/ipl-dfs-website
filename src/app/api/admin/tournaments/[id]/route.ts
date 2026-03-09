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
  console.log('DELETE tournament called')
  try {
    const { id } = await params
    console.log('Tournament ID:', id)
    
    // Check what's associated with this tournament
    console.log('Checking associated data...')
    const [gamesCount, playersCount, contestsCount] = await Promise.all([
      prisma.iPLGame.count({ where: { tournamentId: id } }),
      prisma.player.count({ where: { tournamentId: id } }),
      prisma.contest.count({ 
        where: { 
          iplGame: { tournamentId: id } 
        } 
      })
    ])

    console.log('Counts:', { gamesCount, playersCount, contestsCount })

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

    // If there are games or players, offer cascading delete
    if (gamesCount > 0 || playersCount > 0) {
      const force = request.nextUrl.searchParams.get('force') === 'true'
      
      if (!force) {
        const message = gamesCount > 0 
          ? `Tournament has ${gamesCount} games and ${playersCount} players. Add ?force=true to delete everything.`
          : `Tournament has ${playersCount} players. Add ?force=true to delete everything.`
          
        return NextResponse.json(
          { 
            message,
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
              iplGame: { tournamentId: id }
            }
          }
        })

        // Delete contests for games in this tournament  
        await tx.contest.deleteMany({
          where: {
            iplGame: { tournamentId: id }
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
    console.log('Performing simple delete...')
    await prisma.tournament.delete({
      where: { id }
    })

    console.log('Tournament deleted successfully')
    return NextResponse.json({ message: "Tournament deleted successfully" })
  } catch (error) {
    console.error("Error deleting tournament:", error)
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    return NextResponse.json(
      { 
        message: "Failed to delete tournament",
        error: error instanceof Error ? error.message : "Unknown error",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}