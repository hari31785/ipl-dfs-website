import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { scoreProvider } from '@/lib/scoreProvider'

const prisma = new PrismaClient()

/**
 * POST /api/admin/fetch-scores
 * Fetch scores from external API for a specific IPL game
 */
export async function POST(request: NextRequest) {
  try {
    const { iplGameId, externalMatchId } = await request.json()

    if (!iplGameId) {
      return NextResponse.json(
        { error: 'IPL Game ID is required' },
        { status: 400 }
      )
    }

    // Check if score provider is available
    if (!scoreProvider.isAvailable()) {
      return NextResponse.json(
        { 
          error: 'Score provider is not configured. Please set ENABLE_SCORE_API=true and SCORE_API_KEY in your environment variables.',
          available: false
        },
        { status: 503 }
      )
    }

    // Get the IPL game details
    const iplGame = await prisma.iPLGame.findUnique({
      where: { id: iplGameId },
      include: {
        team1: true,
        team2: true,
        tournament: true
      }
    })

    if (!iplGame) {
      return NextResponse.json(
        { error: 'IPL Game not found' },
        { status: 404 }
      )
    }

    // Fetch scores from external API
    const matchIdToUse = externalMatchId || iplGameId
    const scoreData = await scoreProvider.fetchMatchScores(matchIdToUse)

    if (!scoreData) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch scores from provider. Please enter scores manually.',
          available: true,
          success: false
        },
        { status: 500 }
      )
    }

    // Get all players for this tournament and both teams
    const players = await prisma.player.findMany({
      where: {
        tournamentId: iplGame.tournamentId,
        iplTeamId: {
          in: [iplGame.team1Id, iplGame.team2Id]
        }
      },
      include: {
        iplTeam: true
      }
    })

    // Match players from API response with our database players
    const matchedStats = []
    const unmatchedPlayers = []

    for (const apiPlayer of scoreData.players) {
      // Try to find matching player in our database
      const dbPlayer = players.find(p => 
        p.name.toLowerCase().includes(apiPlayer.playerName.toLowerCase()) ||
        apiPlayer.playerName.toLowerCase().includes(p.name.toLowerCase())
      )

      if (dbPlayer) {
        matchedStats.push({
          playerId: dbPlayer.id,
          playerName: dbPlayer.name,
          teamName: dbPlayer.iplTeam.shortName,
          runs: apiPlayer.runs,
          wickets: apiPlayer.wickets,
          catches: apiPlayer.catches,
          runOuts: apiPlayer.runOuts,
          stumpings: apiPlayer.stumpings,
          didNotPlay: apiPlayer.didNotPlay,
          // Calculate points based on our formula
          points: (apiPlayer.runs * 1) + (apiPlayer.wickets * 20) + 
                  ((apiPlayer.catches + apiPlayer.runOuts + apiPlayer.stumpings) * 5)
        })
      } else {
        unmatchedPlayers.push(apiPlayer.playerName)
      }
    }

    // Mark players who didn't appear in API response as DNP
    const apiPlayerNames = scoreData.players.map(p => p.playerName.toLowerCase())
    const dnpPlayers = players
      .filter(p => !apiPlayerNames.some(name => 
        name.includes(p.name.toLowerCase()) || 
        p.name.toLowerCase().includes(name)
      ))
      .map(p => ({
        playerId: p.id,
        playerName: p.name,
        teamName: p.iplTeam.shortName,
        runs: 0,
        wickets: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        didNotPlay: true,
        points: 0
      }))

    return NextResponse.json({
      success: true,
      available: true,
      data: {
        matchId: scoreData.matchId,
        status: scoreData.status,
        team1: scoreData.team1,
        team2: scoreData.team2,
        lastUpdated: scoreData.lastUpdated,
        stats: [...matchedStats, ...dnpPlayers],
        unmatchedPlayers,
        summary: {
          totalPlayers: scoreData.players.length,
          matchedPlayers: matchedStats.length,
          unmatchedPlayers: unmatchedPlayers.length,
          dnpPlayers: dnpPlayers.length
        }
      }
    })

  } catch (error) {
    console.error('Error in fetch-scores API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        available: false,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * GET /api/admin/fetch-scores/status
 * Check if score provider is available
 */
export async function GET() {
  return NextResponse.json({
    available: scoreProvider.isAvailable(),
    configured: !!process.env.SCORE_API_KEY,
    enabled: process.env.ENABLE_SCORE_API === 'true'
  })
}
