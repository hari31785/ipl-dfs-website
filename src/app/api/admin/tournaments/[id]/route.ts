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
    console.log(`\nDeleting test tournament "${tournament.name}" with ${gamesCount} games, ${playersCount} players, ${contestsCount} contests`)
    console.log('Starting cascading deletion...\n')
    
    // Delete in proper order to avoid foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete draft picks for matchups in this tournament
      const deletedDraftPicks = await tx.draftPick.deleteMany({
        where: {
          matchup: {
            contest: {
              iplGame: { tournamentId: id }
            }
          }
        }
      })
      console.log(`  ✓ Deleted ${deletedDraftPicks.count} draft picks`)

      // 2. Delete head-to-head matchups
      const deletedMatchups = await tx.headToHeadMatchup.deleteMany({
        where: {
          contest: {
            iplGame: { tournamentId: id }
          }
        }
      })
      console.log(`  ✓ Deleted ${deletedMatchups.count} matchups`)

      // 3. Delete contest entries
      const deletedEntries = await tx.contestEntry.deleteMany({
        where: {
          contest: {
            iplGame: { tournamentId: id }
          }
        }
      })
      console.log(`  ✓ Deleted ${deletedEntries.count} contest entries`)

      // 4. Delete contest signups
      const deletedSignups = await tx.contestSignup.deleteMany({
        where: {
          contest: {
            iplGame: { tournamentId: id }
          }
        }
      })
      console.log(`  ✓ Deleted ${deletedSignups.count} contest signups`)

      // 5. Delete coin transactions (VCs won/lost) for this tournament
      const deletedTransactions = await tx.coinTransaction.deleteMany({
        where: { tournamentId: id }
      })
      console.log(`  ✓ Deleted ${deletedTransactions.count} coin transactions`)

      // 6. Delete settlements (VC encashments/refills) for this tournament
      const deletedSettlements = await tx.settlement.deleteMany({
        where: { tournamentId: id }
      })
      console.log(`  ✓ Deleted ${deletedSettlements.count} settlements`)

      // 7. Delete tournament balances
      const deletedBalances = await tx.tournamentBalance.deleteMany({
        where: { tournamentId: id }
      })
      console.log(`  ✓ Deleted ${deletedBalances.count} tournament balances`)

      // 8. Delete contests for games in this tournament  
      const deletedContests = await tx.contest.deleteMany({
        where: {
          iplGame: { tournamentId: id }
        }
      })
      console.log(`  ✓ Deleted ${deletedContests.count} contests`)

      // 9. Delete player stats for this tournament
      const deletedStats = await tx.playerStat.deleteMany({
        where: {
          player: { tournamentId: id }
        }
      })
      console.log(`  ✓ Deleted ${deletedStats.count} player stats`)

      // 10. Delete team players (fantasy teams) for this tournament
      const deletedTeamPlayers = await tx.teamPlayer.deleteMany({
        where: {
          player: { tournamentId: id }
        }
      })
      console.log(`  ✓ Deleted ${deletedTeamPlayers.count} team players`)

      // 11. Delete players in this tournament
      const deletedPlayers = await tx.player.deleteMany({
        where: { tournamentId: id }
      })
      console.log(`  ✓ Deleted ${deletedPlayers.count} players`)

      // 12. Delete games in this tournament
      const deletedGames = await tx.iPLGame.deleteMany({
        where: { tournamentId: id }
      })
      console.log(`  ✓ Deleted ${deletedGames.count} games`)

      // 13. Finally delete the tournament
      await tx.tournament.delete({
        where: { id }
      })
      console.log(`  ✓ Deleted tournament "${tournament.name}"`)
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