# External Score Database Integration

## Overview

The IPL DFS application now supports fetching scores from an external PostgreSQL database (`buddykhel_db_pro`) in addition to manual entry and API sources.

## Tournament Mapping

Our tournaments are mapped to the Buddykhel database series using the `externalSeriesId` field:

| Our Tournament | External Series ID | Status | Games Available |
|----------------|-------------------|---------|----------------|
| IPL 2026 | 12 | MAPPED ✅ | 20 scheduled (Mar 28 - Apr 12, 2026) |
| IPL 2025 | 11 | Available | 74 completed with scores |
| 2024 World Cup | 10 | Available | 55 games (not IPL) |
| IPL 2024 | 6 | Available | 74 completed with scores |

### Setting Up Tournament Mapping

To map a tournament to an external series:

1. **List available series** in the Buddykhel database:
   ```bash
   node scripts/list-external-tournaments.js
   ```

2. **Update your tournament** with the series ID:
   ```bash
   node scripts/map-ipl-2026-tournament.js
   ```
   
   Or update manually in the database:
   ```sql
   UPDATE tournaments 
   SET "externalSeriesId" = 12 
   WHERE name = 'IPL 2026';
   ```

3. **Verify the mapping**:
   ```bash
   node check_tournaments.js
   ```

**Important**: Always verify that games you fetch are from the correct series to ensure data consistency.

## Database Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# External Score Database
ENABLE_SCORE_DB=true
SCORE_DB_HOST=152.53.83.69
SCORE_DB_PORT=5432
SCORE_DB_USER=userhari
SCORE_DB_PASSWORD=Test@2020
SCORE_DB_NAME=buddykhel_db_pro
```

### Database Schema

The external database contains the following relevant tables:

#### `game` Table
- `game_id` (PK): Unique game identifier
- `external_id`: External match identifier
- `date_scheduled`: Match date and time
- `home_team_id`: Home team reference
- `visiting_team_id`: Visiting team reference
- `winner_team_id`: Winner team reference (null if not decided)
- `status_id`: Match status (42 = scheduled, 44 = completed)
- `is_active`: Active status flag

#### `team` Table
- `team_id` (PK): Unique team identifier
- `name`: Full team name (e.g., "Mumbai Indians")
- `code`: Team code (e.g., "MI", "CSK", "RCB")
- `image_path`: Team logo path
- `external_source`: Source identifier ("sportmonk")
- `external_id`: External team ID

#### `player` Table
- `player_id` (PK): Unique player identifier
- `full_name`: Player's full name
- `batting_style`: Batting style (e.g., "Right hand bat")
- `bowling_style`: Bowling style (e.g., "Right arm fast")
- `position`: Player position
- `is_active`: Active status flag

#### `player_series` Table
- Links players to teams for a specific series
- `player_id`: Player reference
- `team_id`: Team reference
- `series_id`: Series reference
- `is_active`: Active status flag

#### `score_info` Table
- `score_info_id` (PK): Unique score record
- `game_id`: Game reference
- `player_id`: Player reference
- `point_type_id`: Type of scoring event (see below)
- `data`: Numeric data (e.g., number of runs, wickets)
- `score`: Points awarded for this event
- `data_info`: Human-readable description
- `is_active`: Active status flag

### Point Types Mapping

**Important:** We only fetch raw statistics (the `data` field) from the external database. Points are calculated using **OUR scoring system**, not the external database's point values.

#### Our Scoring System
- **Runs**: 1 point per run
- **Wickets**: 20 points per wicket
- **Catches**: 5 points per catch
- **Run Outs**: 5 points per run out
- **Stumpings**: 5 points per stumping

**Formula:** `Total Points = (Runs × 1) + (Wickets × 20) + ((Catches + Run Outs + Stumpings) × 5)`

#### External Database Point Types (Used for Fetching Data)

| Point Type | Description | What We Fetch | Example |
|------------|-------------|---------------|---------|
| 45 | Runs scored | `data` field = number of runs | 61 runs |
| 51 | Wickets | `data` field = number of wickets | 3 wickets |
| 57 | Catches | `data` field = number of catches | 2 catches |
| 58 | Run outs | `data` field = number of run outs | 1 run out |
| 61 | Stumpings | `data` field = number of stumpings | 1 stumping |

**Note:** We ignore all other point types (batting bonuses, strike rate bonuses, player of the match awards, etc.) as they are not part of our scoring system. We only extract the core statistics.

## API Usage

### Tournament/Series Verification

**Important:** Before fetching scores, verify that the external game belongs to the correct tournament/series.

#### List Available Tournaments

```bash
node scripts/list-external-tournaments.js
```

This shows all available tournaments/series with:
- Series ID
- Date range
- Total games (completed + scheduled)
- Number of players with scores

Example output:
```
Series ID | Date Range                    | Total Games | Completed | Scheduled | Players
12        | Mar 28, 2026 - Apr 12, 2026   | 20          | 0         | 20        | 0
11        | Mar 22, 2025 - Jun 3, 2025    | 74          | 74        | 0         | 202
6         | Mar 22, 2024 - May 26, 2024   | 74          | 74        | 0         | 209
```

**Series ID Guide:**
- **Series 12**: IPL 2026 (Current season - 20 games scheduled)
- **Series 11**: IPL 2025 (74 games completed with scores ✅)
- **Series 10**: 2024 World Cup (55 games - not IPL)
- **Series 6**: IPL 2024 (74 games completed with scores ✅)

### Finding External Game IDs

Before you can fetch scores, you need to know which external game ID corresponds to your local IPL game.

#### List All Available Games

```bash
node scripts/list-external-games.js
```

This will show the 50 most recent games with:
- Game ID (external database ID)
- Date and time
- Match (team codes)
- Status (Scheduled/Complete)
- Number of score records
- Winner

Example output:
```
Game ID | Series | Date                    | Match                          | Status    | Scores        | Winner
272     | 11     | Jun 3, 2025, 02:00 PM   | RCB vs PBKS                    | Complete  | 738 records   | RCB
271     | 11     | Jun 1, 2025, 02:00 PM   | PBKS vs MI                     | Complete  | 672 records   | PBKS
215     | 11     | Apr 20, 2025, 02:00 PM  | MI vs CSK                      | Complete  | 360 records   | MI
```

**Note the Series column** - this tells you which tournament the game belongs to.

#### Search for Specific Games

```bash
node scripts/search-external-games.js MI CSK
node scripts/search-external-games.js RCB May
node scripts/search-external-games.js GT 2025
```

This will search for games matching your criteria (team codes, names, dates).

### Mapping Process

1. **Verify your tournament is mapped**
   ```bash
   node check_tournaments.js
   ```
   - Ensure your tournament has an `externalSeriesId` set (e.g., 12 for IPL 2026)
   - If not set, run `node scripts/map-ipl-2026-tournament.js`

2. **Identify your tournament's series ID**
   ```bash
   node scripts/list-external-tournaments.js
   ```
   - For IPL 2025: Series ID = **11**
   - For IPL 2026: Series ID = **12**

3. **Check your local game** in the admin panel (`/admin/games`)
   - Note the game ID (e.g., `cmmmgovmm004fn7kbyld59s8k`)
   - Note the teams and date (e.g., "MI vs CSK on April 20, 2025")
   - Verify your tournament ID

4. **Find the corresponding external game from the SAME series**
   ```bash
   node scripts/search-external-games.js MI CSK 2025
   ```
   - Find the game with matching teams and date
   - **Verify Series ID matches your tournament** (e.g., Series 11 for IPL 2025)
   - Note the external Game ID (e.g., `215`)

5. **Use both IDs** in the API call

### Check Status

Check if the external database is configured and connected:

```bash
GET /api/admin/fetch-scores
```

Response:
```json
{
  "database": {
    "configured": true,
    "connected": true,
    "enabled": true
  },
  "api": {
    "configured": false,
    "enabled": false
  },
  "available": true
}
```

### Fetch Scores for a Game

Fetch player scores from the external database for a specific game:

```bash
POST /api/admin/fetch-scores
Content-Type: application/json

{
  "iplGameId": 123,
  "externalMatchId": 272,
  "source": "database"
}
```

Parameters:
- `iplGameId` (required): The game ID in your local database
- `externalMatchId` (required): The game_id in the external database
- `source` (optional): "database" or "api" (defaults to "database")

Response:
```json
{
  "success": true,
  "available": true,
  "data": {
    "matchId": 272,
    "status": "completed",
    "team1": "Royal Challengers Bangalore",
    "team2": "Punjab Kings",
    "stats": [
      {
        "playerId": 45,
        "playerName": "Shashank Singh",
        "teamName": "PBKS",
        "runs": 61,
        "wickets": 0,
        "catches": 0,
        "runOuts": 0,
        "stumpings": 0,
        "didNotPlay": false,
        "points": 61
      },
      {
        "playerId": 12,
        "playerName": "Arshdeep Singh",
        "teamName": "PBKS",
        "runs": 0,
        "wickets": 3,
        "catches": 1,
        "runOuts": 0,
        "stumpings": 0,
        "didNotPlay": false,
        "points": 65
      },
      // ... more players
    ],
    "summary": {
      "totalPlayers": 22,
      "matchedPlayers": 20,
      "unmatchedPlayers": 2,
      "dnpPlayers": 2
    }
  }
}
```

**Points Calculation Examples:**
- Shashank Singh: `(61 × 1) + (0 × 20) + ((0+0+0) × 5) = 61 points`
- Arshdeep Singh: `(0 × 1) + (3 × 20) + ((1+0+0) × 5) = 65 points`

## Code Structure

### `src/lib/scoreDatabase.ts`

Main database client singleton. Key functions:

- `isConfigured()`: Check if environment variables are set
- `testConnection()`: Test database connection
- `getGameData(gameId)`: Fetch complete game data including all player scores
- `getPlayerScores(gameId)`: Fetch just the player scores for a game
- `getTables()`: List all tables (for exploration)
- `getTableStructure(tableName)`: Get column info for a table

### `src/app/api/admin/fetch-scores/route.ts`

API endpoint for fetching and saving scores:

- **POST**: Fetch scores from database/API and match with local players
- **GET**: Check configuration and availability status

## Testing

### Test Database Connection

```bash
node scripts/test-score-db.js
```

This will:
1. Connect to the external database
2. List all tables
3. Show row counts for each table
4. Display sample point types

### Test Game Data Fetch

```bash
node scripts/test-game-fetch.js
```

This will:
1. Find recent completed games (status 44)
2. Fetch full game details
3. Display top 10 players by score
4. Show all point types used in the game

### Find Games with Scores

Use this to find game IDs with actual score data:

```javascript
const { Client } = require('pg');
const client = new Client({
  host: '152.53.83.69',
  port: 5432,
  user: 'userhari',
  password: 'Test@2020',
  database: 'buddykhel_db_pro'
});

await client.connect();

const result = await client.query(`
  SELECT g.game_id, g.date_scheduled, 
         ht.name as home, vt.name as visiting,
         COUNT(si.score_info_id) as score_count
  FROM game g
  LEFT JOIN team ht ON g.home_team_id = ht.team_id
  LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
  LEFT JOIN score_info si ON g.game_id = si.game_id AND si.is_active = true
  WHERE g.is_active = true AND g.status_id = 44
  GROUP BY g.game_id, g.date_scheduled, ht.name, vt.name
  HAVING COUNT(si.score_info_id) > 0
  ORDER BY g.date_scheduled DESC
  LIMIT 10
`);

await client.end();
```

## Player Matching

When fetching scores, the system attempts to match players from the external database with your local player records using:

1. **Name matching**: Fuzzy matching by first name or partial name
2. **Team matching**: Validates player belongs to one of the game's teams

Unmatched players are reported in the response's `unmatchedPlayers` array.

## Status Codes

### Game Status IDs
- `42`: Scheduled (not started)
- `44`: Completed (scores available)

## Troubleshooting

### Connection Issues

If you get connection timeouts:
1. Verify the database host is accessible
2. Check firewall rules allow port 5432
3. Confirm credentials are correct
4. Test with `node scripts/test-score-db.js`

### No Scores Found

If games exist but have no scores:
1. Check if `status_id = 44` (only completed games have scores)
2. Verify `score_info.is_active = true`
3. Use `test-game-fetch.js` to find games with actual score data

### Player Matching Issues

If players aren't being matched:
1. Check player names in both databases
2. Verify `player_series` table links players to correct teams
3. Review the `unmatchedPlayers` in the API response
4. Consider improving the name matching algorithm

**Known Issue:** Some players appear multiple times in the external database with different team associations (e.g., "Virat Kohli" appears with both "India" and "Royal Challengers Bangalore"). The query filters by IPL team codes (RCB, MI, CSK, etc.) to get the most relevant team assignment. You may need to handle duplicates in your matching logic.

## Future Enhancements

1. **Automatic Score Sync**: Scheduled jobs to fetch scores for completed games
2. **Webhook Integration**: Real-time score updates when matches complete
3. **Better Player Matching**: Use external player IDs or more sophisticated matching
4. **Run Outs & Stumpings**: Identify correct point_type_id values
5. **Live Scores**: Support for in-progress match updates
6. **Historical Data**: Batch import of all historical games and scores

## Security Notes

- Database credentials should never be committed to version control
- Use environment variables for all sensitive configuration
- Consider using read-only database user for score fetching
- Implement rate limiting on the fetch-scores endpoint
- Add authentication/authorization for admin endpoints
