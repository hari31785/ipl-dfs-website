/**
 * List all tournaments/series from the buddykhel database
 * This helps you map external series IDs to your local tournaments
 */

const { Client } = require('pg');

const config = {
  host: '152.53.83.69',
  port: 5432,
  user: 'userhari',
  password: 'Test@2020',
  database: 'buddykhel_db_pro'
};

async function listExternalTournaments() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to buddykhel database\n');

    // Get all series/tournaments with game counts
    const result = await client.query(`
      SELECT 
        g.series_id,
        COUNT(DISTINCT g.game_id) as total_games,
        COUNT(DISTINCT CASE WHEN g.status_id = 44 THEN g.game_id END) as completed_games,
        COUNT(DISTINCT CASE WHEN g.status_id = 42 THEN g.game_id END) as scheduled_games,
        MIN(g.date_scheduled) as start_date,
        MAX(g.date_scheduled) as end_date,
        COUNT(DISTINCT si.player_id) FILTER (WHERE si.player_id IS NOT NULL) as players_with_scores
      FROM game g
      LEFT JOIN score_info si ON g.game_id = si.game_id AND si.is_active = true
      WHERE g.is_active = true
      GROUP BY g.series_id
      ORDER BY g.series_id DESC
    `);

    console.log('🏆 Available Tournaments/Series in Buddykhel Database:\n');
    console.log('=' .repeat(110));
    console.log('Series ID | Date Range                    | Total Games | Completed | Scheduled | Players');
    console.log('=' .repeat(110));

    result.rows.forEach(series => {
      const startDate = new Date(series.start_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const endDate = new Date(series.end_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const dateRange = `${startDate} - ${endDate}`;
      
      console.log(
        `${series.series_id.toString().padEnd(9)} | ${dateRange.padEnd(29)} | ${series.total_games.toString().padEnd(11)} | ${series.completed_games.toString().padEnd(9)} | ${series.scheduled_games.toString().padEnd(9)} | ${series.players_with_scores || 0}`
      );
    });

    console.log('=' .repeat(110));

    // Get detailed info for each series
    console.log('\n📊 Detailed Series Information:\n');

    for (const series of result.rows) {
      console.log(`\n🔹 Series ${series.series_id}:`);
      console.log(`   Period: ${new Date(series.start_date).toLocaleDateString()} to ${new Date(series.end_date).toLocaleDateString()}`);
      console.log(`   Total Games: ${series.total_games}`);
      console.log(`   Status: ${series.completed_games} completed, ${series.scheduled_games} scheduled`);
      
      // Get sample games from this series
      const sampleGames = await client.query(`
        SELECT 
          g.game_id,
          g.date_scheduled,
          ht.code as home,
          vt.code as visiting,
          g.status_id
        FROM game g
        LEFT JOIN team ht ON g.home_team_id = ht.team_id
        LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
        WHERE g.series_id = $1 AND g.is_active = true
        ORDER BY g.date_scheduled
        LIMIT 5
      `, [series.series_id]);

      console.log(`   Sample Games:`);
      sampleGames.rows.forEach(g => {
        const date = new Date(g.date_scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const status = g.status_id === 44 ? '✅' : '📅';
        console.log(`     ${status} Game ${g.game_id}: ${g.home} vs ${g.visiting} (${date})`);
      });
    }

    console.log('\n\n💡 How to Use:\n');
    console.log('   1. Identify which series corresponds to your tournament by date range');
    console.log('   2. Note the Series ID');
    console.log('   3. When creating games in your app, use games from that series');
    console.log('   4. Verify games belong to the correct series before fetching scores\n');

    console.log('📌 Series ID Mapping Guide:\n');
    result.rows.forEach(series => {
      const year = new Date(series.start_date).getFullYear();
      const season = series.series_id === 12 ? '2026 Season (Current)' :
                     series.series_id === 11 ? '2025 Season' :
                     series.series_id === 10 ? '2024 Playoffs' :
                     series.series_id === 6 ? '2024 Season' :
                     `Season ${series.series_id}`;
      console.log(`   Series ${series.series_id}: ${season} (${series.total_games} games)`);
    });

    console.log('\n🎯 Example: If you\'re running IPL 2025, use Series ID 11\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

listExternalTournaments();
