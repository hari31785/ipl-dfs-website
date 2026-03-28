const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 'cmn6rfsjf000012ovb4jrkqez';
  const signups = await prisma.contestSignup.findMany({
    where: { userId },
    include: {
      contest: { include: { iplGame: { include: { team1: true, team2: true } } } },
      matchupsAsUser1: {
        include: {
          user2: { include: { user: true } },
          draftPicks: { include: { player: { include: { stats: true } } } }
        }
      },
      matchupsAsUser2: {
        include: {
          user1: { include: { user: true } },
          draftPicks: { include: { player: { include: { stats: true } } } }
        }
      }
    }
  });

  for (const s of signups) {
    const m = s.matchupsAsUser1[0] || s.matchupsAsUser2[0];
    if (!m) continue;
    const isU1 = !!s.matchupsAsUser1[0];
    const myId = isU1 ? m.user1Id : m.user2Id;
    const oppId = isU1 ? m.user2Id : m.user1Id;
    const opp = isU1 ? m.user2?.user?.username : m.user1?.user?.username;
    const game = s.contest?.iplGame;
    const gameLabel = game ? `${game.team1?.shortName} vs ${game.team2?.shortName}` : 'unknown';
    const gameId = s.contest?.iplGameId;

    // Raw sum (all picks including bench)
    const myPicks = m.draftPicks.filter(p => p.pickedByUserId === myId);
    const oppPicks = m.draftPicks.filter(p => p.pickedByUserId === oppId);

    const rawSum = (picks) => picks.reduce((sum, p) => {
      const stat = p.player.stats.find(st => st.iplGameId === gameId);
      return sum + (stat ? stat.points : 0);
    }, 0);

    // Bench-swap sum (starters only, swap DNP with bench)
    const swapSum = (picks) => {
      const starters = picks.filter(p => !p.isBench).sort((a,b) => a.pickOrder - b.pickOrder);
      const bench = picks.filter(p => p.isBench).sort((a,b) => a.pickOrder - b.pickOrder);
      let benchIdx = 0;
      let total = 0;
      for (const starter of starters) {
        const stat = starter.player.stats.find(st => st.iplGameId === gameId);
        if (stat && stat.didNotPlay) {
          // find first non-DNP bench
          while (benchIdx < bench.length) {
            const bp = bench[benchIdx++];
            const bstat = bp.player.stats.find(st => st.iplGameId === gameId);
            if (!bstat || !bstat.didNotPlay) {
              total += bstat ? bstat.points : 0;
              break;
            }
          }
        } else {
          total += stat ? stat.points : 0;
        }
      }
      return total;
    };

    console.log(`\n=== ${gameLabel} | Coin: ${s.contest?.coinValue} ===`);
    console.log(`SignupId: ${s.id} | isUser1: ${isU1}`);
    console.log(`Opponent: @${opp}`);
    console.log(`Status: ${m.status} | WinnerId: ${m.winnerId}`);
    console.log(`user1Id: ${m.user1Id} | user2Id: ${m.user2Id}`);
    console.log(`DB stored → user1Score: ${m.user1Score} | user2Score: ${m.user2Score}`);
    console.log(`Raw sum (all picks) → me: ${rawSum(myPicks)} | opp: ${rawSum(oppPicks)}`);
    console.log(`Bench-swap sum → me: ${swapSum(myPicks)} | opp: ${swapSum(oppPicks)}`);
    console.log(`My picks (${myPicks.length}):`, myPicks.map(p => {
      const stat = p.player.stats.find(st => st.iplGameId === gameId);
      return `${p.player.name}(${p.isBench?'BENCH':'start'}) pts=${stat?.points ?? 'N/A'} dnp=${stat?.didNotPlay ?? false}`;
    }));
    console.log(`Opp picks (${oppPicks.length}):`, oppPicks.map(p => {
      const stat = p.player.stats.find(st => st.iplGameId === gameId);
      return `${p.player.name}(${p.isBench?'BENCH':'start'}) pts=${stat?.points ?? 'N/A'} dnp=${stat?.didNotPlay ?? false}`;
    }));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
