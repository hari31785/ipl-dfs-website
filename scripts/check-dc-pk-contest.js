const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the DC v PK 222 contest
  const games = await prisma.iPLGame.findMany({
    where: {
      OR: [
        { title: { contains: 'DC v PK' } },
        { title: { contains: 'PK v DC' } },
        { title: { contains: 'DC' } }
      ]
    },
    include: {
      contests: {
        include: {
          _count: {
            select: {
              signups: true,
              matchups: true
            }
          },
          matchups: {
            include: {
              _count: {
                select: {
                  draftPicks: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('\n🏏 DC v PK Games and Contests:\n');
  
  for (const game of games) {
    console.log(`\nGame: ${game.title}`);
    console.log(`Game ID: ${game.id}`);
    console.log(`Contests: ${game.contests.length}`);
    
    for (const contest of game.contests) {
      console.log(`\n  📊 Contest: ${contest.contestType} - ${contest.coinValue} coins`);
      console.log(`  Contest ID: ${contest.id}`);
      console.log(`  Status: ${contest.status}`);
      console.log(`  Signups: ${contest._count.signups}`);
      console.log(`  Matchups: ${contest._count.matchups}`);
      
      if (contest.matchups.length > 0) {
        console.log(`\n  Matchup Details:`);
        contest.matchups.forEach((matchup, index) => {
          console.log(`    Matchup ${index + 1}:`);
          console.log(`      Status: ${matchup.status}`);
          console.log(`      Draft Picks: ${matchup._count.draftPicks}/14`);
          console.log(`      First Pick User: ${matchup.firstPickUser || 'Not set'}`);
        });
      }
    }
  }
  
  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
