import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scoreProvider } from '@/lib/scoreProvider'
import { scoreDB } from '@/lib/scoreDatabase'

/**
 * POST /api/admin/fetch-scores
 * Fetch scores from external database or API for a specific IPL game
 */
export async function POST(request: NextRequest) {
  try {
    const { iplGameId, externalMatchId, source = 'database' } = await request.json()

    if (!iplGameId) {
      return NextResponse.json(
        { error: 'IPL Game ID is required' },
        { status: 400 }
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

    let scoreData: any;

    // Use database if configured and requested
    if (source === 'database' && scoreDB.isConfigured()) {
      console.log(`Fetching scores from database for game ${externalMatchId || iplGameId}`);
      
      const isConnected = await scoreDB.testConnection();
      if (!isConnected) {
        return NextResponse.json(
          { error: 'Failed to connect to external score database' },
          { status: 503 }
        );
      }

      const gameData = await scoreDB.getGameData(externalMatchId || iplGameId);
      
      if (!gameData) {
        return NextResponse.json(
          { error: `No data found for external game ID ${externalMatchId || iplGameId}` },
          { status: 404 }
        );
      }

      // Transform to expected format
      // Calculate points using OUR scoring system:
      // Runs: 1 point per run
      // Wickets: 20 points per wicket
      // Catches/Run Outs/Stumpings: 5 points each
      scoreData = {
        matchId: gameData.gameId,
        date: gameData.dateScheduled,
        homeTeam: gameData.homeTeam,
        awayTeam: gameData.visitingTeam,
        status: gameData.status === '44' ? 'completed' : gameData.status === '43' ? 'live' : 'scheduled',
        players: gameData.players.map(p => {
          const points = (p.runs * 1) + (p.wickets * 20) + ((p.catches + p.runOuts + p.stumpings) * 5);
          return {
            playerName: p.playerName,
            teamName: p.teamName,
            runs: p.runs,
            wickets: p.wickets,
            catches: p.catches,
            runOuts: p.runOuts,
            stumpings: p.stumpings,
            didNotPlay: p.didNotPlay,
            points: points,
          };
        }),
      };
    } else {
      // Fall back to API if available
      if (!scoreProvider.isAvailable()) {
        return NextResponse.json(
          { 
            error: 'Neither score database nor score API is configured',
            available: false
          },
          { status: 503 }
        )
      }

      // Fetch scores from external API
      const matchIdToUse = externalMatchId || iplGameId
      scoreData = await scoreProvider.fetchMatchScores(matchIdToUse)
    }

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
          didNotPlay: isCompleted ? apiPlayer.didNotPlay : false,
          // Calculate points based on our formula
          points: (apiPlayer.runs * 1) + (apiPlayer.wickets * 20) + 
                  ((apiPlayer.catches + apiPlayer.runOuts + apiPlayer.stumpings) * 5)
        })
      } else {
        unmatchedPlayers.push(apiPlayer.playerName)
      }
    }

    // Mark players who didn't appear in score data as DNP — only for completed games
    const isCompleted = scoreData.status === 'completed'
    const apiPlayerNames = scoreData.players.map((p: any) => p.playerName.toLowerCase())
    const dnpPlayers = isCompleted
      ? players
          .filter(p => !apiPlayerNames.some((name: string) =>
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
      : [] // live game — never pre-emptively mark anyone as DNP

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
  }
}

/**
 * GET /api/admin/fetch-scores/status
 * Check if score provider is available
 */
export async function GET() {
  const databaseConfigured = scoreDB.isConfigured();
  const apiConfigured = scoreProvider.isAvailable();
  
  let databaseConnected = false;
  if (databaseConfigured) {
    try {
      databaseConnected = await scoreDB.testConnection();
    } catch (error) {
      console.error('Database connection test failed:', error);
    }
  }

  return NextResponse.json({
    database: {
      configured: databaseConfigured,
      connected: databaseConnected,
      enabled: process.env.ENABLE_SCORE_DB === 'true',
    },
    api: {
      configured: apiConfigured,
      enabled: process.env.ENABLE_SCORE_API === 'true',
    },
    available: databaseConnected || apiConfigured,
  })
}
