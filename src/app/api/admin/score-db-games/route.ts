import { NextRequest, NextResponse } from 'next/server'
import { scoreDB } from '@/lib/scoreDatabase'

/**
 * GET /api/admin/score-db-games
 * Returns the list of games from the external score DB that have stats.
 * This is the server-side equivalent of GET http://localhost:3001/games from the bridge.
 * Used by the admin stats page when ENABLE_SCORE_DB=true so the browser never needs
 * to reach the bridge server directly.
 */
export async function GET(request: NextRequest) {
  if (!scoreDB.isConfigured()) {
    return NextResponse.json(
      { error: 'Score database not configured on this server', available: false },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const seriesId = searchParams.get('seriesId') || '12'

  try {
    const games = await scoreDB.getGamesList(seriesId)
    return NextResponse.json({ success: true, games })
  } catch (error) {
    console.error('Error fetching score DB games list:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
