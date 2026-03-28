/**
 * IPL DFS Score Bridge Server
 * 
 * Run this locally when you need to fetch scores from the external score DB.
 * It bridges the gap between Vercel (which can't reach the score DB) and 
 * the admin browser (which can reach localhost).
 * 
 * Usage:
 *   node scripts/score-bridge-server.js
 * 
 * Then click "Fetch Scores from API" in the admin stats page as normal.
 * Keep this running while fetching scores, then Ctrl+C to stop.
 */

const { Pool } = require('pg');
const http = require('http');
const url = require('url');

const PORT = 3001;

// Score DB config — matches .env.local
const SCORE_DB_CONFIG = {
  host: process.env.SCORE_DB_HOST || '152.53.83.69',
  user: process.env.SCORE_DB_USER || 'userhari',
  password: process.env.SCORE_DB_PASSWORD || 'Test@2020',
  database: process.env.SCORE_DB_NAME || 'buddykhel_db_pro',
  port: parseInt(process.env.SCORE_DB_PORT || '5432'),
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(SCORE_DB_CONFIG);

async function fetchPlayerScores(gameId) {
  const client = await pool.connect();
  try {
    // Fetch game info
    const gameResult = await client.query(`
      SELECT 
        g.game_id,
        g.date_scheduled,
        ht.name as home_team,
        vt.name as visiting_team,
        g.status_id
      FROM game g
      LEFT JOIN team ht ON g.home_team_id = ht.team_id
      LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
      WHERE (g.game_id = $1 OR g.external_id = $1::text)
      AND g.is_active = true
      LIMIT 1
    `, [gameId]);

    if (gameResult.rows.length === 0) {
      return { error: `No game found with ID: ${gameId}`, found: false };
    }

    const game = gameResult.rows[0];

    // Fetch player stats
    const statsResult = await client.query(`
      SELECT 
        p.player_id,
        p.full_name as player_name,
        t.name as team_name,
        MAX(CASE WHEN si.point_type_id = 45 THEN si.data::numeric ELSE 0 END) as runs,
        MAX(CASE WHEN si.point_type_id = 51 THEN si.data::numeric ELSE 0 END) as wickets,
        MAX(CASE WHEN si.point_type_id = 57 THEN si.data::numeric ELSE 0 END) as catches,
        MAX(CASE WHEN si.point_type_id = 58 THEN si.data::numeric ELSE 0 END) as run_outs,
        MAX(CASE WHEN si.point_type_id = 61 THEN si.data::numeric ELSE 0 END) as stumpings,
        COUNT(DISTINCT si.point_type_id) as has_stats
      FROM score_info si
      JOIN player p ON si.player_id = p.player_id
      LEFT JOIN player_series ps ON p.player_id = ps.player_id AND ps.is_active = true
      LEFT JOIN team t ON ps.team_id = t.team_id
      WHERE si.game_id = $1
      AND si.is_active = true
      GROUP BY p.player_id, p.full_name, t.name
      ORDER BY runs DESC, wickets DESC
    `, [game.game_id]);

    const players = statsResult.rows.map(row => ({
      playerName: row.player_name,
      teamName: row.team_name || 'Unknown',
      runs: parseFloat(row.runs) || 0,
      wickets: parseFloat(row.wickets) || 0,
      catches: parseFloat(row.catches) || 0,
      runOuts: parseFloat(row.run_outs) || 0,
      stumpings: parseFloat(row.stumpings) || 0,
      didNotPlay: parseInt(row.has_stats) === 0,
    }));

    console.log(`✅ Fetched stats for ${players.length} players from game ${game.game_id}`);

    return {
      found: true,
      gameId: game.game_id,
      homeTeam: game.home_team,
      visitingTeam: game.visiting_team,
      status: game.status_id?.toString() || 'unknown',
      players,
    };
  } finally {
    client.release();
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers — allow the admin browser to call this local server
  // Access-Control-Allow-Private-Network is required for Chrome when
  // a public HTTPS page (Vercel) fetches from localhost (private network)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // Health check
  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', message: 'Score bridge is running and connected to score DB' }));
    } catch (err) {
      res.writeHead(503);
      res.end(JSON.stringify({ status: 'error', message: `DB connection failed: ${err.message}` }));
    }
    return;
  }

  // Fetch available games list
  if (req.method === 'GET' && parsedUrl.pathname === '/games') {
    try {
      const seriesId = parsedUrl.query.seriesId || 12; // default to IPL 2026
      const client = await pool.connect();
      const result = await client.query(`
        SELECT g.game_id, g.date_scheduled, g.status_id,
          ht.name as home_team, vt.name as visiting_team
        FROM game g
        LEFT JOIN team ht ON g.home_team_id = ht.team_id
        LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
        WHERE g.series_id = $1
          AND g.game_id IN (
            SELECT DISTINCT game_id FROM score_info WHERE is_active = true
          )
        ORDER BY g.date_scheduled DESC
        LIMIT 30
      `, [seriesId]);
      client.release();
      const games = result.rows.map(r => ({
        gameId: r.game_id,
        date: r.date_scheduled?.toISOString().split('T')[0],
        homeTeam: r.home_team,
        visitingTeam: r.visiting_team,
        statusId: r.status_id
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, games }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Fetch scores endpoint
  if (req.method === 'POST' && parsedUrl.pathname === '/fetch-scores') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { externalMatchId, iplGameId } = JSON.parse(body || '{}');
        const gameId = externalMatchId || iplGameId;

        if (!gameId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'gameId or externalMatchId is required' }));
          return;
        }

        console.log(`\n🔍 Fetching scores for game ID: ${gameId}`);
        const data = await fetchPlayerScores(gameId);

        if (!data.found) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: data.error }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data }));
      } catch (err) {
        console.error('❌ Error fetching scores:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, async () => {
  console.log('\n🌉 IPL DFS Score Bridge Server');
  console.log('================================');
  console.log(`✅ Running on http://localhost:${PORT}`);
  console.log(`📡 Connecting to score DB at ${SCORE_DB_CONFIG.host}...`);

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Score DB connection successful!');
    console.log('\n📋 Ready — go to the admin stats page and click "Fetch Scores from API"');
    console.log('   Press Ctrl+C to stop the bridge when done.\n');
  } catch (err) {
    console.error('❌ Score DB connection failed:', err.message);
    console.error('   Check SCORE_DB_* env vars or network connectivity.');
    process.exit(1);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process and try again.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});
