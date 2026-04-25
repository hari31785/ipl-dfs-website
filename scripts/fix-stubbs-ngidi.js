/**
 * Fix Stubbs + Ngidi DNP flags and rescore DC v PBKS matchups.
 * 
 * 1. Fetches actual scores from external score DB
 * 2. Updates our DB with correct points + didNotPlay=false
 * 3. Calls the recertify API endpoint
 */

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const scorePool = new Pool({
  host:     process.env.SCORE_DB_HOST,
  user:     process.env.SCORE_DB_USER,
  password: process.env.SCORE_DB_PASSWORD,
  database: process.env.SCORE_DB_NAME,
  port:     parseInt(process.env.SCORE_DB_PORT || '5432'),
});

function calcPoints(runs, wickets, catches, runOuts, stumpings) {
  return runs + (wickets * 25) + (catches * 8) + (runOuts * 8) + (stumpings * 10);
}

async function main() {
  const client = await scorePool.connect();
  try {
    // Find DC v PBKS in external DB (today's game)
    const extGames = await client.query(`
      SELECT g.game_id, ht.code AS home, vt.code AS visiting, g.status_id
      FROM game g
      JOIN team ht ON g.home_team_id = ht.team_id
      JOIN team vt ON g.visiting_team_id = vt.team_id
      WHERE g.date_scheduled BETWEEN (NOW() - INTERVAL '18 hours') AND (NOW() + INTERVAL '6 hours')
        AND g.is_active = true
      ORDER BY g.date_scheduled
    `);
    console.log('External games:', extGames.rows.map(r => r.game_id + ' ' + r.home + ' v ' + r.visiting + ' status=' + r.status_id));

    const dcGame = extGames.rows.find(r =>
      [r.home, r.visiting].includes('DC') && [r.home, r.visiting].includes('PBKS')
    );
    if (!dcGame) { console.error('DC v PBKS not found in external DB'); return; }
    console.log('External game id:', dcGame.game_id);

    // Get all player scores for this game
    const scores = await client.query(`
      SELECT
        p.player_id,
        p.full_name,
        MAX(CASE WHEN si.point_type_id = 45 THEN si.data::numeric ELSE 0 END) AS runs,
        MAX(CASE WHEN si.point_type_id = 51 THEN si.data::numeric ELSE 0 END) AS wickets,
        MAX(CASE WHEN si.point_type_id = 57 THEN si.data::numeric ELSE 0 END) AS catches,
        MAX(CASE WHEN si.point_type_id = 58 THEN si.data::numeric ELSE 0 END) AS run_outs,
        MAX(CASE WHEN si.point_type_id = 61 THEN si.data::numeric ELSE 0 END) AS stumpings,
        COUNT(DISTINCT si.point_type_id) AS has_stats
      FROM score_info si
      JOIN player p ON si.player_id = p.player_id
      WHERE si.game_id = $1::bigint AND si.is_active = true
      GROUP BY p.player_id, p.full_name
    `, [dcGame.game_id]);

    const stubbsRow = scores.rows.find(r => r.full_name.toLowerCase().includes('stubbs'));
    const ngidiRow  = scores.rows.find(r => r.full_name.toLowerCase().includes('ngidi'));

    console.log('\nExternal scores:');
    console.log('Stubbs:', stubbsRow ? JSON.stringify(stubbsRow) : 'NOT FOUND');
    console.log('Ngidi: ', ngidiRow  ? JSON.stringify(ngidiRow)  : 'NOT FOUND');

    // Find our DB game
    const ourGame = await prisma.iPLGame.findFirst({
      where: {
        team1: { shortName: { in: ['DC', 'PBKS'] } },
        team2: { shortName: { in: ['DC', 'PBKS'] } },
        gameDate: { gte: new Date('2026-04-25'), lt: new Date('2026-04-26') }
      }
    });
    if (!ourGame) { console.error('Our DC v PBKS game not found'); return; }
    console.log('\nOur game id:', ourGame.id);

    // Fix Stubbs
    if (stubbsRow && parseInt(stubbsRow.has_stats) > 0) {
      const stubbsPlayer = await prisma.player.findFirst({ where: { name: { contains: 'Stubbs' } } });
      if (stubbsPlayer) {
        const pts = calcPoints(
          parseFloat(stubbsRow.runs)||0,
          parseFloat(stubbsRow.wickets)||0,
          parseFloat(stubbsRow.catches)||0,
          parseFloat(stubbsRow.run_outs)||0,
          parseFloat(stubbsRow.stumpings)||0
        );
        await prisma.playerStat.updateMany({
          where: { playerId: stubbsPlayer.id, iplGameId: ourGame.id },
          data: {
            didNotPlay: false,
            runs: Math.round(parseFloat(stubbsRow.runs)||0),
            wickets: Math.round(parseFloat(stubbsRow.wickets)||0),
            catches: Math.round(parseFloat(stubbsRow.catches)||0),
            runOuts: Math.round(parseFloat(stubbsRow.run_outs)||0),
            stumpings: Math.round(parseFloat(stubbsRow.stumpings)||0),
            points: pts
          }
        });
        console.log(`\nFixed Stubbs: pts=${pts}, dnp=false`);
      }
    } else {
      console.log('\nStubbs has no external stats — leaving as DNP');
    }

    // Fix Ngidi
    if (ngidiRow && parseInt(ngidiRow.has_stats) > 0) {
      const ngidiPlayer = await prisma.player.findFirst({ where: { name: { contains: 'Ngidi' } } });
      if (ngidiPlayer) {
        const pts = calcPoints(
          parseFloat(ngidiRow.runs)||0,
          parseFloat(ngidiRow.wickets)||0,
          parseFloat(ngidiRow.catches)||0,
          parseFloat(ngidiRow.run_outs)||0,
          parseFloat(ngidiRow.stumpings)||0
        );
        await prisma.playerStat.updateMany({
          where: { playerId: ngidiPlayer.id, iplGameId: ourGame.id },
          data: {
            didNotPlay: false,
            runs: Math.round(parseFloat(ngidiRow.runs)||0),
            wickets: Math.round(parseFloat(ngidiRow.wickets)||0),
            catches: Math.round(parseFloat(ngidiRow.catches)||0),
            runOuts: Math.round(parseFloat(ngidiRow.run_outs)||0),
            stumpings: Math.round(parseFloat(ngidiRow.stumpings)||0),
            points: pts
          }
        });
        console.log(`Fixed Ngidi: pts=${pts}, dnp=false`);
      }
    } else {
      console.log('Ngidi has no external stats — leaving as DNP');
    }

    // Verify
    const stubbsCheck = await prisma.player.findFirst({ where: { name: { contains: 'Stubbs' } }, include: { stats: { where: { iplGameId: ourGame.id } } } });
    const ngidiCheck  = await prisma.player.findFirst({ where: { name: { contains: 'Ngidi'  } }, include: { stats: { where: { iplGameId: ourGame.id } } } });
    console.log('\nVerification:');
    console.log('Stubbs:', JSON.stringify(stubbsCheck?.stats?.map(s => ({ dnp: s.didNotPlay, pts: s.points, runs: s.runs, wkts: s.wickets }))));
    console.log('Ngidi: ', JSON.stringify(ngidiCheck?.stats?.map(s => ({ dnp: s.didNotPlay, pts: s.points, runs: s.runs, wkts: s.wickets }))));

    console.log('\nDone. Now run the Re-Certify button in admin for DC v PBKS, or call:');
    console.log(`  curl -X POST https://ipl-dfs-website.vercel.app/api/admin/games/${ourGame.id}/recertify -H "Cookie: <admin-session>"`);

  } finally {
    client.release();
    await scorePool.end();
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
