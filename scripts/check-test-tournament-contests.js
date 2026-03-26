const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestTournamentContests() {
  try {
    console.log('Checking Test Tournament contests...\n');
    
    // Find Test Tournament
    const testTournament = await prisma.tournament.findFirst({
      where: {
        name: 'Test Tournament'
      }
    });

    if (!testTournament) {
      console.log('Test Tournament not found!');
      return;
    }

    console.log(`Test Tournament ID: ${testTournament.id}\n`);

    // Find all contests in Test Tournament
    const contests = await prisma.contest.findMany({
      where: {
        iplGame: {
          tournamentId: testTournament.id
        }
      },
      include: {
        iplGame: true,
        matchups: {
          include: {
            user1: {
              include: {
                user: true
              }
            },
            user2: {
              include: {
                user: true
              }
            },
            draftPicks: {
              include: {
                player: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${contests.length} contests in Test Tournament\n`);

    contests.forEach(contest => {
      console.log(`Contest: ${contest.iplGame.homeTeam} vs ${contest.iplGame.awayTeam}`);
      console.log(`  Type: ${contest.type}`);
      console.log(`  Status: ${contest.status}`);
      console.log(`  Entry Fee: ${contest.entryFee}`);
      console.log(`  Matchups: ${contest.matchups.length}`);
      
      contest.matchups.forEach((matchup, idx) => {
        console.log(`\n  Matchup ${idx + 1}:`);
        console.log(`    User 1: ${matchup.user1.user.username}`);
        console.log(`    User 2: ${matchup.user2.user.username}`);
        console.log(`    Status: ${matchup.status}`);
        console.log(`    First Pick User: ${matchup.firstPickUser || 'NULL (will trigger toss)'}`);
        console.log(`    Draft Picks: ${matchup.draftPicks.length}`);
        
        if (matchup.draftPicks.length > 0) {
          console.log(`    Sample picks: ${matchup.draftPicks.slice(0, 3).map(p => p.player.name).join(', ')}...`);
        }
      });
      
      console.log('\n---\n');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestTournamentContests();
