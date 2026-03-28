const { Pool } = require('pg');
const fs = require('fs');

const connStr = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL="([^"]+)"/)?.[1];
const appPool = new Pool({ connectionString: connStr });

const scorePool = new Pool({
  host: '152.53.83.69', user: 'userhari', password: 'Test@2020',
  database: 'buddykhel_db_pro', port: 5432, connectionTimeoutMillis: 10000
});

async function main() {
  // App DB games
  const appGames = await appPool.query(`
    SELECT g.id, g.title, g."gameDate", g.status, t1."shortName" as team1, t2."shortName" as team2
    FROM ipl_games g
    JOIN ipl_teams t1 ON g."team1Id" = t1.id
    JOIN ipl_teams t2 ON g."team2Id" = t2.id
    ORDER BY g."gameDate" DESC LIMIT 10
  `);
  console.log('\n=== APP DB GAMES (recent) ===');
  appGames.rows.forEach(x => {
    const d = x.gameDate ? new Date(x.gameDate).toISOString().split('T')[0] : '?';
    console.log(`${x.id.slice(-8)} | ${d} | ${x.team1} vs ${x.team2} | ${x.status}`);
  });

  // Score DB games with data
  const scoreGames = await scorePool.query(`
    SELECT g.game_id, g.date_scheduled, ht.name as home, vt.name as visiting
    FROM game g
    LEFT JOIN team ht ON g.home_team_id = ht.team_id
    LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
    WHERE g.game_id IN (SELECT DISTINCT game_id FROM score_info WHERE is_active=true)
    ORDER BY g.date_scheduled DESC LIMIT 10
  `);
  console.log('\n=== SCORE DB GAMES (with data) ===');
  scoreGames.rows.forEach(x => {
    const d = x.date_scheduled ? new Date(x.date_scheduled).toISOString().split('T')[0] : '?';
    console.log(`ID:${x.game_id} | ${d} | ${x.home} vs ${x.visiting}`);
  });

  // Pick the most recent score DB game and show its players
  const latestGameId = scoreGames.rows[0]?.game_id;
  if (latestGameId) {
    const players = await scorePool.query(`
      SELECT DISTINCT p.full_name
      FROM score_info si
      JOIN player p ON si.player_id = p.player_id
      WHERE si.game_id = $1 AND si.is_active = true
      ORDER BY p.full_name
    `, [latestGameId]);
    console.log(`\n=== SCORE DB PLAYERS (game ${latestGameId}) ===`);
    players.rows.forEach(x => console.log(' -', x.full_name));
  }

  await appPool.end();
  await scorePool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
