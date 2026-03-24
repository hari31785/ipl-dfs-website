/**
 * List all available games from the external buddykhel database
 * This helps you map external game IDs to your local IPL games
 */

const { Client } = require('pg');

const config = {
  host: '152.53.83.69',
  port: 5432,
  user: 'userhari',
  password: 'Test@2020',
  database: 'buddykhel_db_pro'
};

async function listExternalGames() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to buddykhel database\n');

    // Get all games with team information
    const result = await client.query(`
      SELECT 
        g.game_id,
        g.external_id,
        g.series_id,
        g.date_scheduled,
        g.status_id,
        ht.name as home_team,
        ht.code as home_code,
        vt.name as visiting_team,
        vt.code as visiting_code,
        wt.name as winner,
        wt.code as winner_code,
        COUNT(si.score_info_id) as score_count
      FROM game g
      LEFT JOIN team ht ON g.home_team_id = ht.team_id
      LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
      LEFT JOIN team wt ON g.winner_team_id = wt.team_id
      LEFT JOIN score_info si ON g.game_id = si.game_id AND si.is_active = true
      WHERE g.is_active = true
      GROUP BY 
        g.game_id, g.external_id, g.series_id, g.date_scheduled, g.status_id,
        ht.name, ht.code, vt.name, vt.code, wt.name, wt.code
      ORDER BY g.date_scheduled DESC
      LIMIT 50
    `);

    console.log('📊 Available Games in Buddykhel Database (Most Recent 50):\n');
    console.log('=' .repeat(115));
    console.log('Game ID | Series | Date                    | Match                          | Status  | Scores | Winner');
    console.log('=' .repeat(115));

    result.rows.forEach(game => {
      const date = new Date(game.date_scheduled).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const match = `${game.home_code || '???'} vs ${game.visiting_code || '???'}`;
      const status = game.status_id === 44 ? 'Complete' : 
                     game.status_id === 42 ? 'Scheduled' : 
                     `Status ${game.status_id}`;
      const scores = game.score_count > 0 ? `${game.score_count} records` : 'No scores';
      const winner = game.winner_code || '-';

      console.log(
        `${game.game_id.toString().padEnd(7)} | ${game.series_id.toString().padEnd(6)} | ${date.padEnd(23)} | ${match.padEnd(30)} | ${status.padEnd(7)} | ${scores.padEnd(14)} | ${winner}`
      );
    });

    console.log('=' .repeat(100));
    console.log('\n📌 Status Codes:');
    console.log('   - 42: Scheduled (no scores yet)');
    console.log('   - 44: Completed (scores available)\n');

    // Get status summary
    const statusResult = await client.query(`
      SELECT 
        status_id,
        COUNT(*) as count,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM score_info si 
          WHERE si.game_id = g.game_id AND si.is_active = true
        ) THEN 1 END) as games_with_scores
      FROM game g
      WHERE is_active = true
      GROUP BY status_id
      ORDER BY status_id
    `);

    console.log('📈 Games Summary by Status:\n');
    statusResult.rows.forEach(row => {
      console.log(`   Status ${row.status_id}: ${row.count} games (${row.games_with_scores} with scores)`);
    });

    // Get team summary
    const teamResult = await client.query(`
      SELECT 
        t.code,
        t.name,
        COUNT(DISTINCT CASE WHEN g.home_team_id = t.team_id THEN g.game_id END) as home_games,
        COUNT(DISTINCT CASE WHEN g.visiting_team_id = t.team_id THEN g.game_id END) as away_games
      FROM team t
      LEFT JOIN game g ON (g.home_team_id = t.team_id OR g.visiting_team_id = t.team_id) 
        AND g.is_active = true
      WHERE t.code IN ('RCB', 'MI', 'CSK', 'KKR', 'DC', 'SRH', 'RR', 'GT', 'LSG', 'PBKS')
      GROUP BY t.code, t.name
      ORDER BY t.code
    `);

    console.log('\n🏏 IPL Teams in Database:\n');
    teamResult.rows.forEach(team => {
      const total = parseInt(team.home_games) + parseInt(team.away_games);
      console.log(`   ${team.code.padEnd(5)} - ${team.name.padEnd(30)} (${total} games)`);
    });

    console.log('\n💡 How to Use:');
    console.log('   1. Find the game you want by date and teams');
    console.log('   2. Note the "Game ID" (first column)');
    console.log('   3. Use that Game ID as "externalMatchId" when calling the fetch-scores API');
    console.log('\n   Example API call:');
    console.log('   POST /api/admin/fetch-scores');
    console.log('   {');
    console.log('     "iplGameId": 1,           // Your local game ID');
    console.log('     "externalMatchId": 272,   // The Game ID from above table');
    console.log('     "source": "database"');
    console.log('   }\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

listExternalGames();
