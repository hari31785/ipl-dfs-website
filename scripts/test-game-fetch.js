/**
 * Test script for fetching game data from external score database
 */

const { Client } = require('pg');

const config = {
  host: '152.53.83.69',
  port: 5432,
  user: 'userhari',
  password: 'Test@2020',
  database: 'buddykhel_db_pro'
};

async function testGameFetch() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to score database\n');

    // Get a sample game
    const gamesResult = await client.query(`
      SELECT game_id, date_scheduled, status_id 
      FROM game 
      WHERE is_active = true 
      ORDER BY date_scheduled DESC 
      LIMIT 5
    `);

    console.log(`Found ${gamesResult.rows.length} recent games:`);
    gamesResult.rows.forEach(game => {
      console.log(`  - Game ${game.game_id}: ${game.date_scheduled} (Status: ${game.status_id})`);
    });

    if (gamesResult.rows.length > 0) {
      const gameId = gamesResult.rows[0].game_id;
      console.log(`\n📊 Testing full game data fetch for game ${gameId}...\n`);

      // Test full game data fetch
      const gameResult = await client.query(`
        SELECT 
          g.game_id,
          g.date_scheduled,
          ht.name as home_team,
          ht.code as home_code,
          vt.name as visiting_team,
          vt.code as visiting_code,
          wt.name as winner,
          g.status_id
        FROM game g
        LEFT JOIN team ht ON g.home_team_id = ht.team_id
        LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
        LEFT JOIN team wt ON g.winner_team_id = wt.team_id
        WHERE g.game_id = $1
        AND g.is_active = true
      `, [gameId]);

      if (gameResult.rows.length > 0) {
        const game = gameResult.rows[0];
        console.log('Game Details:');
        console.log(`  ID: ${game.game_id}`);
        console.log(`  Date: ${game.date_scheduled}`);
        console.log(`  Home: ${game.home_team} (${game.home_code})`);
        console.log(`  Visiting: ${game.visiting_team} (${game.visiting_code})`);
        console.log(`  Winner: ${game.winner || 'Not decided'}`);
        console.log(`  Status: ${game.status_id}`);

        // Get player scores
        console.log('\n👥 Player Scores:\n');
        const scoresResult = await client.query(`
          SELECT 
            p.player_id,
            p.full_name as player_name,
            t.name as team_name,
            t.code as team_code,
            MAX(CASE WHEN si.point_type_id = 45 THEN si.data ELSE 0 END) as runs,
            MAX(CASE WHEN si.point_type_id = 47 THEN si.data ELSE 0 END) as fours,
            MAX(CASE WHEN si.point_type_id = 48 THEN si.data ELSE 0 END) as sixes,
            MAX(CASE WHEN si.point_type_id = 51 THEN si.data ELSE 0 END) as wickets,
            MAX(CASE WHEN si.point_type_id = 53 THEN si.data ELSE 0 END) as catches,
            MAX(CASE WHEN si.point_type_id = 54 THEN si.data ELSE 0 END) as run_outs,
            MAX(CASE WHEN si.point_type_id = 56 THEN si.data ELSE 0 END) as stumpings,
            SUM(si.score) as total_score,
            COUNT(DISTINCT si.point_type_id) as stat_types
          FROM score_info si
          JOIN player p ON si.player_id = p.player_id
          LEFT JOIN player_series ps ON p.player_id = ps.player_id
          LEFT JOIN team t ON ps.team_id = t.team_id
          WHERE si.game_id = $1
          AND si.is_active = true
          GROUP BY p.player_id, p.full_name, t.name, t.code
          ORDER BY total_score DESC
          LIMIT 10
        `, [gameId]);

        console.log(`Top ${scoresResult.rows.length} Players by Score:\n`);
        scoresResult.rows.forEach((player, idx) => {
          console.log(`${idx + 1}. ${player.player_name} (${player.team_code || 'N/A'})`);
          console.log(`   Score: ${player.total_score}`);
          if (parseFloat(player.runs) > 0) console.log(`   Runs: ${player.runs}`);
          if (parseFloat(player.fours) > 0) console.log(`   Fours: ${player.fours}`);
          if (parseFloat(player.sixes) > 0) console.log(`   Sixes: ${player.sixes}`);
          if (parseFloat(player.wickets) > 0) console.log(`   Wickets: ${player.wickets}`);
          if (parseFloat(player.catches) > 0) console.log(`   Catches: ${player.catches}`);
          if (parseFloat(player.run_outs) > 0) console.log(`   Run Outs: ${player.run_outs}`);
          if (parseFloat(player.stumpings) > 0) console.log(`   Stumpings: ${player.stumpings}`);
          console.log(`   Stat types: ${player.stat_types}`);
          console.log('');
        });

        // Get all point types used
        const pointTypesResult = await client.query(`
          SELECT DISTINCT point_type_id, MIN(data_info) as description
          FROM score_info
          WHERE game_id = $1
          AND is_active = true
          GROUP BY point_type_id
          ORDER BY point_type_id
        `, [gameId]);

        console.log('\n📋 Point Types Used in This Game:\n');
        pointTypesResult.rows.forEach(pt => {
          console.log(`  Type ${pt.point_type_id}: ${pt.description}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testGameFetch();
