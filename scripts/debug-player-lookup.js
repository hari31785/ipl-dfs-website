const { Pool } = require('pg');
const fs = require('fs');

const connStr = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL="([^"]+)"/)?.[1];
const pool = new Pool({ connectionString: connStr });

async function main() {
  // Get the two app DB games
  const games = await pool.query(`
    SELECT g.id, g.title, g."tournamentId", g."team1Id", g."team2Id",
      t1."shortName" as team1, t2."shortName" as team2
    FROM ipl_games g
    JOIN ipl_teams t1 ON g."team1Id" = t1.id
    JOIN ipl_teams t2 ON g."team2Id" = t2.id
    ORDER BY g."gameDate" DESC LIMIT 5
  `);

  for (const game of games.rows) {
    console.log(`\n=== Game: ${game.title} ===`);
    console.log(`  gameId: ${game.id}`);
    console.log(`  tournamentId: ${game.tournamentId}`);
    console.log(`  team1Id: ${game.team1Id} (${game.team1})`);
    console.log(`  team2Id: ${game.team2Id} (${game.team2})`);

    // Check how many players match this game's tournamentId + teams
    const players = await pool.query(`
      SELECT p.name, t."shortName"
      FROM players p
      JOIN ipl_teams t ON p."iplTeamId" = t.id
      WHERE p."tournamentId" = $1
        AND p."iplTeamId" IN ($2, $3)
      ORDER BY t."shortName", p.name
    `, [game.tournamentId, game.team1Id, game.team2Id]);

    console.log(`  Players found in DB for this game: ${players.rows.length}`);
    if (players.rows.length === 0) {
      // Check if players exist without tournament filter
      const noFilter = await pool.query(`
        SELECT COUNT(*) as cnt FROM players p
        WHERE p."iplTeamId" IN ($1, $2)
      `, [game.team1Id, game.team2Id]);
      console.log(`  Players for these teams (ANY tournament): ${noFilter.rows[0].cnt}`);

      // Check tournament on players
      const withTournament = await pool.query(`
        SELECT DISTINCT p."tournamentId", COUNT(*) as cnt FROM players p
        WHERE p."iplTeamId" IN ($1, $2)
        GROUP BY p."tournamentId"
      `, [game.team1Id, game.team2Id]);
      console.log(`  Player tournament IDs:`, withTournament.rows);
    } else {
      players.rows.slice(0, 5).forEach(p => console.log(`    ${p.shortName}: ${p.name}`));
      if (players.rows.length > 5) console.log(`    ... and ${players.rows.length - 5} more`);
    }
  }

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
