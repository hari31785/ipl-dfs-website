/**
 * Score Provider Integration
 * 
 * This module handles fetching cricket match statistics from external API providers
 * Configure your API provider details in environment variables
 */

interface PlayerPerformance {
  playerId?: string
  playerName: string
  teamName: string
  runs: number
  wickets: number
  catches: number
  runOuts: number
  stumpings: number
  didNotPlay: boolean
}

interface MatchScoreData {
  matchId: string
  status: 'upcoming' | 'live' | 'completed'
  team1: string
  team2: string
  players: PlayerPerformance[]
  lastUpdated: string
}

interface ScoreProviderConfig {
  apiKey?: string
  baseUrl?: string
  enabled: boolean
}

class ScoreProviderService {
  private config: ScoreProviderConfig

  constructor() {
    this.config = {
      apiKey: process.env.SCORE_API_KEY,
      baseUrl: process.env.SCORE_API_BASE_URL || 'https://api.cricketdata.org/v1',
      enabled: process.env.ENABLE_SCORE_API === 'true'
    }
  }

  /**
   * Check if score provider is configured and available
   */
  isAvailable(): boolean {
    return this.config.enabled && !!this.config.apiKey
  }

  /**
   * Fetch match scores from the external API
   * @param matchId - External match ID or our internal IPL game ID
   */
  async fetchMatchScores(matchId: string): Promise<MatchScoreData | null> {
    if (!this.isAvailable()) {
      console.log('Score provider not configured')
      return null
    }

    try {
      const url = `${this.config.baseUrl}/matches/${matchId}/scorecard`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      })

      if (!response.ok) {
        console.error(`Score API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data = await response.json()
      
      // Transform the API response to our format
      return this.transformScoreData(data)
    } catch (error) {
      console.error('Error fetching scores from provider:', error)
      return null
    }
  }

  /**
   * Transform external API data to our internal format
   * This needs to be customized based on your actual API provider's response format
   */
  private transformScoreData(apiData: any): MatchScoreData {
    // TODO: Customize this based on your actual API provider's response structure
    // This is a sample transformation - adjust based on actual API response
    
    const players: PlayerPerformance[] = []

    // Example transformation - adjust based on your API structure
    if (apiData.players) {
      for (const player of apiData.players) {
        players.push({
          playerName: player.name || '',
          teamName: player.team || '',
          runs: player.batting?.runs || 0,
          wickets: player.bowling?.wickets || 0,
          catches: player.fielding?.catches || 0,
          runOuts: player.fielding?.runOuts || 0,
          stumpings: player.fielding?.stumpings || 0,
          didNotPlay: player.didNotPlay || false
        })
      }
    }

    return {
      matchId: apiData.matchId || apiData.id || '',
      status: apiData.status || 'upcoming',
      team1: apiData.team1?.name || '',
      team2: apiData.team2?.name || '',
      players,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get match status from external API
   */
  async getMatchStatus(matchId: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const url = `${this.config.baseUrl}/matches/${matchId}/status`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.status || null
    } catch (error) {
      console.error('Error fetching match status:', error)
      return null
    }
  }

  /**
   * Map our internal player to external API player
   * This helps in finding the correct player in API response
   */
  async findPlayerMapping(playerName: string, teamName: string): Promise<string | null> {
    // TODO: Implement player name matching logic
    // You may want to maintain a mapping table in your database
    return null
  }
}

// Export singleton instance
export const scoreProvider = new ScoreProviderService()

// Export types
export type { PlayerPerformance, MatchScoreData, ScoreProviderConfig }
