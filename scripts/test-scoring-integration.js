/**
 * Test script to verify external DB integration with OUR scoring system
 */

const { Client } = require('pg');

// Our scoring formula (same as in the application)
function calculatePoints(stats) {
  return (
    (stats.runs * 1) + 
    (stats.wickets * 20) + 
    ((stats.catches + stats.runOuts + stats.stumpings) * 5)
  );
}

const config = {
  host: '152.53.83.69',
  port: 5432,
  user: 'userhari',
  password: 'Test@2020',
  database: 'buddykhel_db_pro'
};

async function testScoringIntegration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to external score database\n');

    // Find a completed game with scores
    const gamesResult = await client.query(`
      SELECT g.game_id, 
             ht.name as home, ht.code as home_code,
             vt.name as visiting, vt.code as visiting_code,
             COUNT(si.score_info_id) as score_count
      FROM game g
      LEFT JOIN team ht ON g.home_team_id = ht.team_id
      LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
      LEFT JOIN score_info si ON g.game_id = si.game_id AND si.is_active = true
      WHERE g.is_active = true 
      AND g.status_id = 44
      GROUP BY g.game_id, ht.name, ht.code, vt.name, vt.code
      HAVING COUNT(si.score_info_id) > 100
      ORDER BY g.game_id DESC
      LIMIT 1
    `);

    if (gamesResult.rows.length === 0) {
      console.log('❌ No completed games found');
      return;
    }

    const game = gamesResult.rows[0];
    console.log(`📊 Testing Game ${game.game_id}: ${game.home} vs ${game.visiting}`);
    console.log(`   Score records: ${game.score_count}\n`);

    // Fetch player stats using our extraction logic
    const statsResult = await client.query(`
      SELECT 
        p.player_id,
        p.full_name as player_name,
        t.code as team_code,
        MAX(CASE WHEN si.point_type_id = 45 THEN si.data::numeric ELSE 0 END) as runs,
        MAX(CASE WHEN si.point_type_id = 51 THEN si.data::numeric ELSE 0 END) as wickets,
        MAX(CASE WHEN si.point_type_id = 57 THEN si.data::numeric ELSE 0 END) as catches,
        MAX(CASE WHEN si.point_type_id = 58 THEN si.data::numeric ELSE 0 END) as run_outs,
        MAX(CASE WHEN si.point_type_id = 61 THEN si.data::numeric ELSE 0 END) as stumpings,
        COUNT(DISTINCT si.point_type_id) as stat_types
      FROM score_info si
      JOIN player p ON si.player_id = p.player_id
      LEFT JOIN player_series ps ON p.player_id = ps.player_id AND ps.is_active = true
      LEFT JOIN team t ON ps.team_id = t.team_id
      WHERE si.game_id = $1
      AND si.is_active = true
      AND t.code IN ('RCB', 'PBKS', 'MI', 'CSK', 'KKR', 'DC', 'SRH', 'RR', 'GT', 'LSG')
      GROUP BY p.player_id, p.full_name, t.code
      ORDER BY runs DESC, wickets DESC
      LIMIT 15
    `, [game.game_id]);

    console.log('🏆 Top 15 Players (Sorted by Performance):\n');
    console.log('=' .repeat(80));

    let totalPointsTeam1 = 0;
    let totalPointsTeam2 = 0;
    let playersTeam1 = 0;
    let playersTeam2 = 0;

    statsResult.rows.forEach((player, i) => {
      const stats = {
        runs: parseFloat(player.runs) || 0,
        wickets: parseFloat(player.wickets) || 0,
        catches: parseFloat(player.catches) || 0,
        runOuts: parseFloat(player.run_outs) || 0,
        stumpings: parseFloat(player.stumpings) || 0,
      };

      const points = calculatePoints(stats);
      const didNotPlay = parseInt(player.stat_types) === 0;

      // Track team totals
      if (player.team_code === game.home_code) {
        totalPointsTeam1 += points;
        playersTeam1++;
      } else if (player.team_code === game.visiting_code) {
        totalPointsTeam2 += points;
        playersTeam2++;
      }

      console.log(`${(i + 1).toString().padStart(2)}. ${player.player_name.padEnd(25)} (${player.team_code || 'N/A'})`);
      
      const statParts = [];
      if (stats.runs > 0) statParts.push(`${stats.runs}R`);
      if (stats.wickets > 0) statParts.push(`${stats.wickets}W`);
      if (stats.catches > 0) statParts.push(`${stats.catches}C`);
      if (stats.runOuts > 0) statParts.push(`${stats.runOuts}RO`);
      if (stats.stumpings > 0) statParts.push(`${stats.stumpings}ST`);
      
      const statsDisplay = statParts.length > 0 ? statParts.join(', ') : 'No stats';
      console.log(`    📈 Stats: ${statsDisplay}`);
      console.log(`    ⭐ Points: ${points} ${didNotPlay ? '(DNP)' : ''}`);
      
      // Show calculation for players with multiple stat types
      if (statParts.length > 1) {
        const calculation = `(${stats.runs}×1) + (${stats.wickets}×20) + ((${stats.catches}+${stats.runOuts}+${stats.stumpings})×5)`;
        console.log(`    🧮 Formula: ${calculation} = ${points}`);
      }
      console.log('');
    });

    console.log('=' .repeat(80));
    console.log('\n📊 Summary:\n');
    console.log(`${game.home} (${game.home_code}): ${playersTeam1} players, ${totalPointsTeam1} total points`);
    console.log(`${game.visiting} (${game.visiting_code}): ${playersTeam2} players, ${totalPointsTeam2} total points`);
    console.log('\n✅ All points calculated using OUR scoring system:');
    console.log('   • Runs: 1 point per run');
    console.log('   • Wickets: 20 points per wicket');
    console.log('   • Catches/Run Outs/Stumpings: 5 points each\n');

    // Verify data quality
    console.log('🔍 Data Quality Check:\n');
    
    const qualityResult = await client.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN si.point_type_id = 45 THEN si.player_id END) as players_with_runs,
        COUNT(DISTINCT CASE WHEN si.point_type_id = 51 THEN si.player_id END) as players_with_wickets,
        COUNT(DISTINCT CASE WHEN si.point_type_id = 57 THEN si.player_id END) as players_with_catches,
        COUNT(DISTINCT CASE WHEN si.point_type_id = 58 THEN si.player_id END) as players_with_runouts,
        COUNT(DISTINCT CASE WHEN si.point_type_id = 61 THEN si.player_id END) as players_with_stumpings,
        COUNT(DISTINCT si.player_id) as total_unique_players
      FROM score_info si
      WHERE si.game_id = $1
      AND si.is_active = true
    `, [game.game_id]);

    const quality = qualityResult.rows[0];
    console.log(`   Total unique players: ${quality.total_unique_players}`);
    console.log(`   Players with runs: ${quality.players_with_runs}`);
    console.log(`   Players with wickets: ${quality.players_with_wickets}`);
    console.log(`   Players with catches: ${quality.players_with_catches}`);
    console.log(`   Players with run outs: ${quality.players_with_runouts}`);
    console.log(`   Players with stumpings: ${quality.players_with_stumpings}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testScoringIntegration();
