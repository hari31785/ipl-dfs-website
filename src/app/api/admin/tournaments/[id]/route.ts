import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


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
    
    // First, get the tournament to check its name
    const tournament = await prisma.tournament.findUnique({
      where: { id }
    })

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      )
    }

    // Only allow deletion of tournaments with "Test" in the name
    if (!tournament.name.toLowerCase().includes('test')) {
      return NextResponse.json(
        { 
          message: `Cannot delete tournament "${tournament.name}". Only tournaments with "Test" in the name can be deleted.`,
          tournamentName: tournament.name
        },
        { status: 403 }
      )
    }
    
    // Check what's associated with this tournament
    const [gamesCount, playersCount, contestsCount] = await Promise.all([
      prisma.iPLGame.count({ where: { tournamentId: id } }),
      prisma.player.count({ where: { tournamentId: id } }),
      prisma.contest.count({ 
        where: { 
          iplGame: { tournamentId: id } 
        } 
      })
    ])

    // Force delete with cascading - delete all child tables
    console.log(`Deleting test tournament "${tournament.name}" with ${gamesCount} games, ${playersCount} players, ${contestsCount} contests`)
    
    // Delete in proper order to avoid foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete draft picks for matchups in this tournament
      await tx.draftPick.deleteMany({
        where: {
          matchup: {
            contest: {
              iplGame: { tournamentId: id }
            }
          }
        }
      })

      // 2. Delete head-to-head matchups
      await tx.headToHeadMatchup.deleteMany({
        where: {
          contest: {
            iplGame: { tournamentId: id }
          }
        }
      })

      // 3. Delete contest entries
      await tx.contestEntry.deleteMany({
        where: {
          contest: {
            iplGame: { tournamentId: id }
          }
        }
      })

      // 4. Delete contest signups
      await tx.contestSignup.deleteMany({
        where: {
          contest: {
            iplGame: { tournamentId: id }
          }
        }
      })

      // 5. Delete coin transactions for this tournament
      await tx.coinTransaction.deleteMany({
        where: { tournamentId: id }
      })

      // 6. Delete tournament balances
      await tx.tournamentBalance.deleteMany({
        where: { tournamentId: id }
      })

      // 7. Delete contests for games in this tournament  
      await tx.contest.deleteMany({
        where: {
          iplGame: { tournamentId: id }
        }
      })

      // 8. Delete player stats for this tournament
      await tx.playerStat.deleteMany({
        where: {
          player: { tournamentId: id }
        }
      })

      // 9. Delete team players (fantasy teams) for this tournament
      await tx.teamPlayer.deleteMany({
        where: {
          player: { tournamentId: id }
        }
      })

      // 10. Delete players in this tournament
      await tx.player.deleteMany({
        where: { tournamentId: id }
      })

      // 11. Delete games in this tournament
      await tx.iPLGame.deleteMany({
        where: { tournamentId: id }
      })

      // 12. Finally delete the tournament
      await tx.tournament.delete({
        where: { id }
      })
    })

    return NextResponse.json({ 
      message: `Tournament "${tournament.name}" and all associated data deleted successfully`,
      deleted: { 
        tournament: tournament.name,
        contests: contestsCount, 
        games: gamesCount, 
        players: playersCount 
      }
    })
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
  }
}