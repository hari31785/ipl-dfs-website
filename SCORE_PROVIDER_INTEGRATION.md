# Score Provider Integration Guide

## Overview

The IPL DFS platform supports automatic fetching of player statistics from external cricket data APIs. This guide explains how to integrate and customize the score provider.

## Features

- ✅ **One-Click Score Fetch** - Admin can fetch scores with a single button click
- ✅ **Auto-Population** - Fetched scores automatically populate the stats form
- ✅ **Manual Override** - Admin can review and edit any auto-populated stats
- ✅ **Graceful Fallback** - If API is unavailable, seamlessly switch to manual entry
- ✅ **Player Matching** - Intelligent matching between API players and database players
- ✅ **DNP Detection** - Automatically marks players who didn't play

## Setup

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Enable the score provider
ENABLE_SCORE_API=true

# Add your API key
SCORE_API_KEY=your_actual_api_key_here

# Set the base URL for your provider
SCORE_API_BASE_URL=https://api.yourprovider.com/v1
```

### 2. Customize the Score Provider

The score provider service is located at `src/lib/scoreProvider.ts`. You'll need to customize the `transformScoreData()` method to match your API's response format.

## Supported Score Providers

### Option 1: CricAPI (Recommended)
- **Website**: https://www.cricapi.com
- **Pricing**: Free tier available
- **Features**: Live scores, ball-by-ball updates, player stats

```bash
SCORE_API_BASE_URL=https://api.cricapi.com/v1
SCORE_API_KEY=your_cricapi_key
```

### Option 2: Cricketdata.org
- **Website**: https://cricketdata.org
- **Pricing**: Paid subscription
- **Features**: Historical data, comprehensive stats

```bash
SCORE_API_BASE_URL=https://api.cricketdata.org/v1
SCORE_API_KEY=your_cricketdata_key
```

### Option 3: RapidAPI Cricket
- **Website**: https://rapidapi.com/hub
- **Pricing**: Various tiers
- **Features**: Multiple cricket data sources

```bash
SCORE_API_BASE_URL=https://cricket-live-data.p.rapidapi.com
SCORE_API_KEY=your_rapidapi_key
```

## Customizing the Integration

### Understanding the Data Flow

1. **Admin clicks "Fetch Scores"** → Triggers `handleFetchScores()`
2. **API Request** → Calls `/api/admin/fetch-scores` endpoint
3. **Score Provider** → Fetches data from external API
4. **Transform Data** → Converts API response to our format
5. **Player Matching** → Matches API players with database players
6. **Auto-Populate** → Fills in the stats form
7. **Admin Review** → Admin can edit before saving

### API Response Format Expected

Your score provider should return data that can be transformed to this format:

```typescript
interface MatchScoreData {
  matchId: string
  status: 'upcoming' | 'live' | 'completed'
  team1: string
  team2: string
  players: Array<{
    playerName: string
    teamName: string
    runs: number
    wickets: number
    catches: number
    runOuts: number
    stumpings: number
    didNotPlay: boolean
  }>
  lastUpdated: string
}
```

### Example: Customizing for CricAPI

Edit `src/lib/scoreProvider.ts`:

```typescript
private transformScoreData(apiData: any): MatchScoreData {
  const players: PlayerPerformance[] = []

  // CricAPI specific transformation
  if (apiData.data && apiData.data.scorecard) {
    for (const inning of apiData.data.scorecard) {
      for (const batsman of inning.batting) {
        players.push({
          playerName: batsman.name,
          teamName: inning.team,
          runs: batsman.runs || 0,
          wickets: 0,
          catches: 0,
          runOuts: 0,
          stumpings: 0,
          didNotPlay: batsman.dnb || false
        })
      }
      
      for (const bowler of inning.bowling) {
        const existingPlayer = players.find(p => p.playerName === bowler.name)
        if (existingPlayer) {
          existingPlayer.wickets = bowler.wickets || 0
        } else {
          players.push({
            playerName: bowler.name,
            teamName: inning.team,
            runs: 0,
            wickets: bowler.wickets || 0,
            catches: 0,
            runOuts: 0,
            stumpings: 0,
            didNotPlay: false
          })
        }
      }
    }
  }

  return {
    matchId: apiData.data.id || '',
    status: apiData.data.status || 'upcoming',
    team1: apiData.data.team1 || '',
    team2: apiData.data.team2 || '',
    players,
    lastUpdated: new Date().toISOString()
  }
}
```

## API Questions for Your Provider

Before integrating, ask your score provider:

### 1. Authentication
- What's the authentication method? (API key, OAuth, Bearer token)
- Where should the API key be sent? (header, query param)
- Are there different keys for test/production?

### 2. Endpoints
- What's the endpoint for match scorecards?
- How do I get match status?
- What's the endpoint for player statistics?

### 3. Match Identification
- How are matches identified? (match ID, tournament + teams)
- Do you provide a way to search for matches by date/teams?

### 4. Data Structure
- What's the JSON structure of the scorecard response?
- How are players organized? (by team, by innings)
- How is DNP (Did Not Play) indicated?

### 5. Rate Limits
- What are the rate limits?
- How are errors returned when rate limit is exceeded?

### 6. Costs
- What's the pricing model?
- How many API calls per match?
- Are there webhook options to reduce polling?

## Usage

### Admin Workflow

1. **Navigate to Admin Stats Page**
   - Go to `/admin/stats`

2. **Select a Game**
   - Choose the IPL game from the dropdown

3. **Fetch Scores** (if configured)
   - Click "Fetch Scores from API" button
   - Optionally enter external match ID if different
   - Review the auto-populated stats

4. **Review and Edit**
   - Check all player statistics
   - Edit any incorrect values
   - Verify DNP (Did Not Play) flags

5. **Save**
   - Click "Save All Stats" to commit to database

### Manual Entry (Fallback)

If the API is unavailable or returns errors:
- Simply enter stats manually in the form
- All fields work the same way
- No difference in the final saved data

## Troubleshooting

### "Score Provider Not Configured"
- Check `ENABLE_SCORE_API=true` in `.env`
- Verify `SCORE_API_KEY` is set
- Restart your development server

### "Failed to Fetch Scores"
- Check API key is valid
- Verify base URL is correct
- Check network connectivity
- Review API rate limits

### "Unmatched Players"
- Player names in API don't exactly match database
- Solution: Update player names in database to match API
- Or: Customize the player matching logic in `fetchMatchScores`

### API Returns Different Format
- Customize `transformScoreData()` in `src/lib/scoreProvider.ts`
- Log the raw API response to understand structure
- Map fields accordingly

## Advanced: Player Name Mapping

If player names don't match between your database and the API, create a mapping table:

```sql
CREATE TABLE player_api_mappings (
  player_id TEXT PRIMARY KEY,
  api_player_name TEXT NOT NULL,
  api_player_id TEXT
);
```

Then update the matching logic in `/api/admin/fetch-scores/route.ts`.

## Testing Without Real API

For testing, you can create mock data:

1. Set `ENABLE_SCORE_API=true`
2. Modify `scoreProvider.fetchMatchScores()` to return mock data
3. Test the full flow without making real API calls

```typescript
async fetchMatchScores(matchId: string): Promise<MatchScoreData | null> {
  // Return mock data for testing
  return {
    matchId: matchId,
    status: 'completed',
    team1: 'MI',
    team2: 'CSK',
    players: [
      {
        playerName: 'Rohit Sharma',
        teamName: 'MI',
        runs: 45,
        wickets: 0,
        catches: 1,
        runOuts: 0,
        stumpings: 0,
        didNotPlay: false
      },
      // ... more mock players
    ],
    lastUpdated: new Date().toISOString()
  }
}
```

## Support

For integration help:
1. Check your score provider's documentation
2. Review the code in `src/lib/scoreProvider.ts`
3. Test with sample API responses
4. Contact your API provider's support for endpoint/format questions
