const { Pool } = require('pg');
const p = new Pool({ host:'152.53.83.69', user:'userhari', password:'Test@2020', database:'buddykhel_db_pro', port:5432, connectionTimeoutMillis:10000 });

async function main() {
  // Find IPL series
  const series = await p.query("SELECT s.series_id, s.name, s.start_date, s.end_date FROM series s WHERE s.name ILIKE '%IPL%' ORDER BY s.start_date DESC LIMIT 10");
  console.log('=== IPL Series ===');
  series.rows.forEach(x => console.log(x.series_id, x.name, x.start_date?.toISOString().split('T')[0]));

  // Find which series game 273 belongs to
  const g273 = await p.query("SELECT g.game_id, g.series_id, g.date_scheduled, s.name FROM game g LEFT JOIN series s ON g.series_id = s.series_id WHERE g.game_id IN (273, 272, 271)");
  console.log('\n=== Series for games 271-273 ===');
  g273.rows.forEach(x => console.log('game', x.game_id, '| series_id:', x.series_id, '|', x.name, '|', x.date_scheduled?.toISOString().split('T')[0]));

  await p.end();
}
main().catch(e => { console.error(e.message); p.end(); });
