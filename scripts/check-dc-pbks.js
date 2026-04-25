const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateFinalLineup(userPicks, gameId) {
  const starters = userPicks.filter(p => !p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  const bench = userPicks.filter(p => p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  let benchIndex = 0;
  const usedBenchPlayerIds = new Set();
  const swappedOutPlayers = [];
  const finalLineup = starters.map(starter => {
    const starterStats = starter.player.stats.find(s => s.iplGameId === gameId);
    if (starterStats?.didNotPlay) {
      while (benchIndex < bench.length) {
        const benchPlayer = bench[benchIndex++];
        const benchStats = benchPlayer.player.stats.find(s => s.iplGameId === gameId);
        if (!benchStats?.didNotPlay) {
          usedBenchPlayerIds.add(benchPlayer.playerId);
          swappedOutPlayers.push({ ...starter, swappedOut: true, replacedBy: benchPlayer.player.name });
          return { ...benchPlayer, swappedFor: starter.player.name, isSwapped: true, points: benchStats?.points || 0 };
        }
      }
      swappedOutPlayers.push({ ...starter, swappedOut: true, replacedBy: null });
      return { ...starter, isSwapped: false, points: 0 };
    }
    return { ...starter, isSwapped: false, points: starterStats?.points || 0 };
  });
  const unusedBench = bench.filter(b => !usedBenchPlayerIds.has(b.playerId));
  return { finalLineup, benchPlayers: [...swappedOutPlayers, ...unusedBench] };
}

function calculateTotalPointsWithSwap(userPicks, gameId) {
  const { finalLineup } = calculateFinalLineup(userPicks, gameId);
  return finalLineup.reduce((t, p) => t + p.points, 0);
}


async function main() {
  const games = await prisma.iPLGame.findMany({
    where: { gameDate: { gte: new Date('2026-04-25'), lt: new Date('2026-04-26') } },
    include: { team1: true, team2: true }
  });
  console.log('Games today:', games.map(g => g.id + ' ' + g.team1?.shortName + ' v ' + g.team2?.shortName));

  const dcGame = games.find(g =>
    [g.team1?.shortName, g.team2?.shortName].includes('DC') ||
    [g.team1?.shortName, g.team2?.shortName].includes('PBKS')
  );
  if (!dcGame) { console.log('DC/PBKS game not found'); return; }
  console.log('\nDC v PBKS game id:', dcGame.id);

  // Check Stubbs and Ngidi
  const stubbs = await prisma.player.findMany({ where: { name: { contains: 'Stubbs' } }, include: { stats: { where: { iplGameId: dcGame.id } } } });
  const ngidi  = await prisma.player.findMany({ where: { name: { contains: 'Ngidi'  } }, include: { stats: { where: { iplGameId: dcGame.id } } } });

  console.log('\n--- Stubbs ---');
  stubbs.forEach(p => console.log(p.name, p.id, '→', JSON.stringify(p.stats.map(s => ({ dnp: s.didNotPlay, pts: s.points })))));
  console.log('--- Ngidi ---');
  ngidi.forEach(p => console.log(p.name, p.id, '→', JSON.stringify(p.stats.map(s => ({ dnp: s.didNotPlay, pts: s.points })))));

  // Show all matchup scores and recalculate live
  const contests = await prisma.contest.findMany({
    where: { iplGameId: dcGame.id },
    include: {
      matchups: {
        include: {
          user1: { include: { user: true } },
          user2: { include: { user: true } },
          draftPicks: { include: { player: { include: { stats: true } } } }
        }
      }
    }
  });

  for (const c of contests) {
    console.log('\n=== Contest', c.coinValue, 'coins | status:', c.status, '===');
    for (const m of c.matchups) {
      const u1picks = m.draftPicks.filter(p => p.pickedByUserId === m.user1.id);
      const u2picks = m.draftPicks.filter(p => p.pickedByUserId === m.user2.id);
      const calc1 = calculateTotalPointsWithSwap(u1picks, dcGame.id);
      const calc2 = calculateTotalPointsWithSwap(u2picks, dcGame.id);
      const stored1 = m.user1Score;
      const stored2 = m.user2Score;
      const mismatch = calc1 !== stored1 || calc2 !== stored2;
      console.log(
        m.user1?.user?.username, `(stored:${stored1} calc:${calc1})`,
        'vs',
        m.user2?.user?.username, `(stored:${stored2} calc:${calc2})`,
        mismatch ? '⚠️ MISMATCH' : '✓'
      );
    }
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
