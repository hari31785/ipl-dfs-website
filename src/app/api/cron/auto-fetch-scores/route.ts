import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Pool } from 'pg'

/**
 * GET /api/cron/auto-fetch-scores
 *
 * Vercel cron job — runs every 10 minutes between 11:00–19:00 UTC (6AM–2PM EST).
 * Automatically fetches player scores from the external score DB for any IPL game
 * scheduled today that has score data available (i.e. is live or completed).
 *
 * DNP logic mirrors the manual admin fetch:
 *   - external status_id = 44 (completed) → DNP players are marked
 *   - any other status (live/in-progress)  → no DNP marking
 *
 * Admin manual fetch button remains unchanged as the fallback.
 */

// ─── External score DB pool (direct — reuses same env vars as scoreDatabase.ts) ─
function getScorePool() {
  return new Pool({
    host:     process.env.SCORE_DB_HOST,
    user:     process.env.SCORE_DB_USER,
    password: process.env.SCORE_DB_PASSWORD,
    database: process.env.SCORE_DB_NAME,
    port:     parseInt(process.env.SCORE_DB_PORT || '5432'),
    max: 3,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
  })
}

// ─── Time window check ──────────────────────────────────────────────────────────
// Weekdays (Mon–Fri): 10AM–2PM EST = 15:00–19:00 UTC
// Weekends (Sat–Sun):  6AM–2PM EST = 11:00–19:00 UTC
// Internal guard covers the right range per day; cron schedule in
// vercel.json enforces the tighter weekday window automatically.
function isWithinWindow(): boolean {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const dayOfWeek = now.getUTCDay() // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  if (isWeekend) return utcHour >= 11 && utcHour < 19  // 6AM–2PM EST
  return utcHour >= 15 && utcHour < 19                 // 10AM–2PM EST
}

export async function GET(request: NextRequest) {
  // 1. Validate Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Time window guard (belt-and-suspenders — schedule in vercel.json already limits this)
  if (!isWithinWindow()) {
    return NextResponse.json({ skipped: 'outside time window (6AM–2PM EST)' })
  }

  // 3. Check score DB is configured
  if (!process.env.SCORE_DB_HOST || !process.env.SCORE_DB_USER || process.env.ENABLE_SCORE_DB !== 'true') {
    return NextResponse.json({ skipped: 'score DB not configured' })
  }

  const scorePool = getScorePool()
  const results: any[] = []

  try {
    const scoreClient = await scorePool.connect()

    try {
      // 4. Find today's games in the EXTERNAL score DB that have score data
      //    (status_id != 42 means not "upcoming/not started")
      //    We look ±1 day to handle timezone edge cases around midnight
      const externalGames = await scoreClient.query(`
        SELECT
          g.game_id,
          g.status_id,
          g.date_scheduled,
          ht.code AS home_code,
          vt.code AS visiting_code
        FROM game g
        JOIN team ht ON g.home_team_id = ht.team_id
        JOIN team vt ON g.visiting_team_id = vt.team_id
        WHERE g.date_scheduled::date BETWEEN NOW() AT TIME ZONE 'UTC' - INTERVAL '12 hours'
                                         AND NOW() AT TIME ZONE 'UTC' + INTERVAL '12 hours'
          AND g.is_active = true
          AND g.status_id != 42
        ORDER BY g.date_scheduled
      `)

      if (externalGames.rows.length === 0) {
        return NextResponse.json({ skipped: 'no active/completed games in external DB today' })
      }

      // 5. For each external game, find a matching game in OUR DB
      for (const extGame of externalGames.rows) {
        const homeCode     = extGame.home_code      // e.g. 'MI'
        const visitingCode = extGame.visiting_code  // e.g. 'RCB'
        const externalGameId = parseInt(extGame.game_id, 10)
        const isCompleted  = String(extGame.status_id) === '44'

        // Match by shortName on both teams (order-independent)
        const ourGame = await prisma.iPLGame.findFirst({
          where: {
            team1: { shortName: { in: [homeCode, visitingCode] } },
            team2: { shortName: { in: [homeCode, visitingCode] } },
            gameDate: {
              gte: new Date(new Date(extGame.date_scheduled).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(extGame.date_scheduled).setHours(23, 59, 59, 999)),
            },
          },
          include: {
            team1: true,
            team2: true,
            tournament: true,
          },
        })

        if (!ourGame) {
          results.push({
            externalGameId,
            teams: `${homeCode} vs ${visitingCode}`,
            skipped: 'no matching game in our DB',
          })
          continue
        }

        // 6. Fetch player scores from external DB (same SQL as scoreDatabase.ts getPlayerScores)
        const scoresResult = await scoreClient.query(`
          SELECT
            p.player_id,
            p.full_name AS player_name,
            t.name      AS team_name,
            MAX(CASE WHEN si.point_type_id = 45 THEN si.data::numeric ELSE 0 END) AS runs,
            MAX(CASE WHEN si.point_type_id = 51 THEN si.data::numeric ELSE 0 END) AS wickets,
            MAX(CASE WHEN si.point_type_id = 57 THEN si.data::numeric ELSE 0 END) AS catches,
            MAX(CASE WHEN si.point_type_id = 58 THEN si.data::numeric ELSE 0 END) AS run_outs,
            MAX(CASE WHEN si.point_type_id = 61 THEN si.data::numeric ELSE 0 END) AS stumpings,
            COUNT(DISTINCT si.point_type_id) AS has_stats
          FROM score_info si
          JOIN player p ON si.player_id = p.player_id
          LEFT JOIN player_series ps ON p.player_id = ps.player_id AND ps.is_active = true
          LEFT JOIN team t ON ps.team_id = t.team_id
          WHERE si.game_id = $1::bigint
            AND si.is_active = true
          GROUP BY p.player_id, p.full_name, t.name
          ORDER BY runs DESC, wickets DESC
        `, [externalGameId])

        const rawPlayers = scoresResult.rows.map(row => ({
          playerName: row.player_name as string,
          runs:       parseFloat(row.runs)      || 0,
          wickets:    parseFloat(row.wickets)   || 0,
          catches:    parseFloat(row.catches)   || 0,
          runOuts:    parseFloat(row.run_outs)  || 0,
          stumpings:  parseFloat(row.stumpings) || 0,
          didNotPlay: parseInt(row.has_stats)   === 0,
        }))

        if (rawPlayers.length === 0) {
          results.push({
            externalGameId,
            game: ourGame.title,
            skipped: 'no score rows yet in external DB',
          })
          continue
        }

        // 7. Get our players for both teams in this tournament
        const dbPlayers = await prisma.player.findMany({
          where: {
            tournamentId: ourGame.tournamentId,
            iplTeamId: { in: [ourGame.team1Id, ourGame.team2Id] },
          },
          include: { iplTeam: true },
        })

        // 8. Match player names → same fuzzy logic as match-scores/route.ts
        const rawPlayerNamesLower = rawPlayers.map(p => p.playerName.toLowerCase())
        const matchedStats: any[] = []
        const unmatchedPlayers: string[] = []

        for (const rawPlayer of rawPlayers) {
          const dbPlayer = dbPlayers.find(p =>
            p.name.toLowerCase().includes(rawPlayer.playerName.toLowerCase()) ||
            rawPlayer.playerName.toLowerCase().includes(p.name.toLowerCase())
          )
          const points =
            (rawPlayer.runs * 1) +
            (rawPlayer.wickets * 20) +
            ((rawPlayer.catches + rawPlayer.runOuts + rawPlayer.stumpings) * 5)

          if (dbPlayer) {
            matchedStats.push({
              playerId:   dbPlayer.id,
              runs:       rawPlayer.runs,
              wickets:    rawPlayer.wickets,
              catches:    rawPlayer.catches,
              runOuts:    rawPlayer.runOuts,
              stumpings:  rawPlayer.stumpings,
              // DNP logic: only for completed games — same as manual admin flow
              didNotPlay: isCompleted ? rawPlayer.didNotPlay : false,
              points,
            })
          } else {
            unmatchedPlayers.push(rawPlayer.playerName)
          }
        }

        // DNP players: in our DB but not in external data — only for completed games
        const dnpPlayers = isCompleted
          ? dbPlayers
              .filter(p => !rawPlayerNamesLower.some(name =>
                name.includes(p.name.toLowerCase()) ||
                p.name.toLowerCase().includes(name)
              ))
              .map(p => ({
                playerId:  p.id,
                runs:      0,
                wickets:   0,
                catches:   0,
                runOuts:   0,
                stumpings: 0,
                didNotPlay: true,
                points:    0,
              }))
          : [] // live game — never pre-emptively mark DNP

        const allStats = [...matchedStats, ...dnpPlayers]

        // 9. Upsert each stat (findFirst → update or create — same as stats/route.ts)
        let saved = 0
        for (const stat of allStats) {
          const existing = await prisma.playerStat.findFirst({
            where: { iplGameId: ourGame.id, playerId: stat.playerId },
          })
          if (existing) {
            await prisma.playerStat.update({
              where: { id: existing.id },
              data: {
                runs:       stat.runs,
                wickets:    stat.wickets,
                catches:    stat.catches,
                runOuts:    stat.runOuts,
                stumpings:  stat.stumpings,
                didNotPlay: stat.didNotPlay,
                points:     stat.points,
              },
            })
          } else {
            await prisma.playerStat.create({
              data: {
                iplGameId:  ourGame.id,
                playerId:   stat.playerId,
                runs:       stat.runs,
                wickets:    stat.wickets,
                catches:    stat.catches,
                runOuts:    stat.runOuts,
                stumpings:  stat.stumpings,
                didNotPlay: stat.didNotPlay,
                points:     stat.points,
              },
            })
          }
          saved++
        }

        results.push({
          externalGameId,
          game:        ourGame.title,
          status:      isCompleted ? 'completed' : 'live',
          saved,
          unmatched:   unmatchedPlayers.length,
          unmatchedNames: unmatchedPlayers,
          dnpMarked:   dnpPlayers.length,
        })
      }
    } finally {
      scoreClient.release()
      await scorePool.end()
    }

    return NextResponse.json({ success: true, results })

  } catch (error) {
    console.error('[cron/auto-fetch-scores] Error:', error)
    try { await scorePool.end() } catch {}
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
