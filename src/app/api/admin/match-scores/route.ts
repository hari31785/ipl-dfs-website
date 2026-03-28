import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/match-scores
 * 
 * Accepts raw player stats fetched by the local score bridge server,
 * matches player names to our DB records, and returns matched stats with playerIds.
 * 
 * This is the Vercel-side handler for the local bridge workflow.
 */
export async function POST(request: NextRequest) {
  try {
    const { iplGameId, rawPlayers } = await request.json()

    if (!iplGameId || !rawPlayers || !Array.isArray(rawPlayers)) {
      return NextResponse.json(
        { error: 'iplGameId and rawPlayers array are required' },
        { status: 400 }
      )
    }

    if (rawPlayers.length === 0) {
      return NextResponse.json(
        { error: 'No score data found for this game in the score database. The game may not have been played yet — try selecting a completed game (marked ✓ completed in the picker).' },
        { status: 422 }
      )
    }

    // Get the game to find the tournament and teams
    const iplGame = await prisma.iPLGame.findUnique({
      where: { id: iplGameId },
      include: {
        team1: true,
        team2: true,
        tournament: true,
      }
    })

    if (!iplGame) {
      return NextResponse.json(
        { error: 'IPL Game not found' },
        { status: 404 }
      )
    }

    // Get all players for both teams in this tournament
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

    const matchedStats = []
    const unmatchedPlayers = []

    for (const rawPlayer of rawPlayers) {
      // Match by name — try contains match in both directions
      const dbPlayer = players.find(p =>
        p.name.toLowerCase().includes(rawPlayer.playerName.toLowerCase()) ||
        rawPlayer.playerName.toLowerCase().includes(p.name.toLowerCase())
      )

      const points =
        (rawPlayer.runs * 1) +
        (rawPlayer.wickets * 20) +
        ((rawPlayer.catches + rawPlayer.runOuts + rawPlayer.stumpings) * 5)

      if (dbPlayer) {
        matchedStats.push({
          playerId: dbPlayer.id,
          playerName: dbPlayer.name,
          teamName: dbPlayer.iplTeam.shortName,
          runs: rawPlayer.runs,
          wickets: rawPlayer.wickets,
          catches: rawPlayer.catches,
          runOuts: rawPlayer.runOuts,
          stumpings: rawPlayer.stumpings,
          didNotPlay: rawPlayer.didNotPlay,
          points,
        })
      } else {
        unmatchedPlayers.push(rawPlayer.playerName)
      }
    }

    // Players in our DB not found in the raw data — mark as DNP
    const rawPlayerNames = rawPlayers.map((p: any) => p.playerName.toLowerCase())
    const dnpPlayers = players
      .filter(p => !rawPlayerNames.some((name: string) =>
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
        points: 0,
      }))

    return NextResponse.json({
      success: true,
      available: true,
      data: {
        stats: [...matchedStats, ...dnpPlayers],
        unmatchedPlayers,
        summary: {
          totalPlayers: rawPlayers.length,
          matchedPlayers: matchedStats.length,
          unmatchedPlayers: unmatchedPlayers.length,
          dnpPlayers: dnpPlayers.length,
        }
      }
    })

  } catch (error) {
    console.error('Error in match-scores API:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
