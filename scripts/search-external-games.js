/**
 * Search for specific games in the buddykhel database
 * Usage: node scripts/search-external-games.js MI CSK
 */

const { Client } = require('pg');

const config = {
  host: '152.53.83.69',
  port: 5432,
  user: 'userhari',
  password: 'Test@2020',
  database: 'buddykhel_db_pro'
};

async function searchGames() {
  const client = new Client(config);
  
  // Get search terms from command line arguments
  const searchTerms = process.argv.slice(2);
  
  if (searchTerms.length === 0) {
    console.log('Usage: node scripts/search-external-games.js [team1] [team2] [month]');
    console.log('Examples:');
    console.log('  node scripts/search-external-games.js MI CSK');
    console.log('  node scripts/search-external-games.js RCB May');
    console.log('  node scripts/search-external-games.js GT 2025');
    process.exit(0);
  }

  try {
    await client.connect();
    
    // Build search query
    let whereClause = 'g.is_active = true';
    const params = [];
    
    searchTerms.forEach((term, index) => {
      params.push(`%${term}%`);
      whereClause += ` AND (
        ht.code ILIKE $${params.length} OR 
        vt.code ILIKE $${params.length} OR 
        ht.name ILIKE $${params.length} OR 
        vt.name ILIKE $${params.length} OR
        g.date_scheduled::text ILIKE $${params.length}
      )`;
    });

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
      WHERE ${whereClause}
      GROUP BY 
        g.game_id, g.external_id, g.series_id, g.date_scheduled, g.status_id,
        ht.name, ht.code, vt.name, vt.code, wt.name, wt.code
      ORDER BY g.date_scheduled DESC
      LIMIT 100
    `, params);

    console.log(`\n🔍 Search Results for: "${searchTerms.join(' ')}"\n`);
    console.log('=' .repeat(115));
    console.log('Game ID | Series | Date                    | Match                          | Status    | Scores        | Winner');
    console.log('=' .repeat(115));

    if (result.rows.length === 0) {
      console.log('No games found matching your search criteria.');
    } else {
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
          `${game.game_id.toString().padEnd(7)} | ${game.series_id.toString().padEnd(6)} | ${date.padEnd(23)} | ${match.padEnd(30)} | ${status.padEnd(9)} | ${scores.padEnd(13)} | ${winner}`
        );
      });

      console.log('=' .repeat(100));
      console.log(`\n✅ Found ${result.rows.length} matching game(s)\n`);
      
      // Show games with scores
      const withScores = result.rows.filter(g => g.score_count > 0);
      if (withScores.length > 0) {
        console.log(`📊 ${withScores.length} game(s) have scores available\n`);
        console.log('💡 To fetch scores for a game, use:');
        console.log('   POST /api/admin/fetch-scores');
        console.log('   {');
        console.log(`     "iplGameId": [YOUR_LOCAL_GAME_ID],`);
        console.log(`     "externalMatchId": ${withScores[0].game_id},  // Example: first game with scores`);
        console.log('     "source": "database"');
        console.log('   }\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

searchGames();
