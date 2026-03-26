const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const game = await prisma.iPLGame.findFirst({
      where: {
        title: { contains: 'MI v RCB', mode: 'insensitive' }
      }
    });
    
    console.log('Game:', game.title, '| ID:', game.id);
    
    // Check player stats for this game
    const stats = await prisma.playerStat.findMany({
      where: {
        iplGameId: game.id
      },
      include: {
        player: {
          include: {
            iplTeam: true
          }
        }
      }
    });
    
    console.log('\nPlayer Stats in DB:', stats.length);
    stats.forEach(stat => {
      console.log(`  - ${stat.player.name} (${stat.player.iplTeam.shortName}): ${stat.points} pts (Runs: ${stat.runs}, Wickets: ${stat.wickets}, DNP: ${stat.didNotPlay})`);
    });
    
    // Check a matchup for this game
    const contest = await prisma.contest.findFirst({
      where: { iplGameId: game.id }
    });
    
    if (contest) {
      console.log('\nContest ID:', contest.id);
      
      const matchup = await prisma.headToHeadMatchup.findFirst({
        where: { contestId: contest.id },
        include: {
          draftPicks: {
            include: {
              player: {
                include: {
                  stats: {
                    where: {
                      iplGameId: game.id
                    }
                  },
                  iplTeam: true
                }
              }
            }
          }
        }
      });
      
      if (matchup) {
        console.log('Matchup ID:', matchup.id);
        console.log('\nDraft Picks:');
        matchup.draftPicks.forEach(pick => {
          const stat = pick.player.stats[0];
          console.log(`  - ${pick.player.name}: stats=${stat ? 'YES' : 'NO'}, points=${stat?.points || 0}`);
        });
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
