const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Checking MI v KKR and RCB v SRH contests...\n');
    
    // Find games containing these teams
    const games = await prisma.iplGame.findMany({
      where: {
        OR: [
          {
            AND: [
              { team1: { shortName: { in: ['MI', 'KKR'] } } },
              { team2: { shortName: { in: ['MI', 'KKR'] } } }
            ]
          },
          {
            AND: [
              { team1: { shortName: { in: ['RCB', 'SRH'] } } },
              { team2: { shortName: { in: ['RCB', 'SRH'] } } }
            ]
          }
        ]
      },
      include: {
        team1: true,
        team2: true,
        tournament: true,
        contests: {
          include: {
            _count: {
              select: {
                signups: true
              }
            }
          }
        }
      },
      orderBy: {
        gameDate: 'desc'
      }
    });
    
    console.log(`Found ${games.length} games matching criteria:\n`);
    
    games.forEach(game => {
      console.log(`=== ${game.team1.shortName} vs ${game.team2.shortName} ===`);
      console.log(`Game ID: ${game.id}`);
      console.log(`Game Date: ${new Date(game.gameDate).toLocaleString()}`);
      console.log(`Signup Deadline: ${new Date(game.signupDeadline).toLocaleString()}`);
      console.log(`Game Status: ${game.status}`);
      console.log(`Tournament: ${game.tournament.name} (Active: ${game.tournament.isActive})`);
      console.log(`Tournament Status: ${game.tournament.status}`);
      console.log(`Contests: ${game.contests.length}`);
      
      game.contests.forEach((contest, index) => {
        console.log(`  Contest ${index + 1}: ${contest.contestType} (${contest.coinValue} coins)`);
        console.log(`    Status: ${contest.status}`);
        console.log(`    Signups: ${contest._count.signups}/${contest.maxParticipants}`);
      });
      
      console.log('');
    });
    
    // Now let's check what the tournaments API would return
    console.log('🔍 Checking tournaments API criteria...\n');
    
    const tournaments = await prisma.tournament.findMany({
      where: {
        isActive: true,
        status: {
          in: ['ACTIVE', 'UPCOMING']
        }
      },
      include: {
        games: {
          where: {
            contests: {
              some: {
                status: 'SIGNUP_OPEN'
              }
            }
          },
          include: {
            team1: true,
            team2: true,
            contests: {
              where: {
                status: 'SIGNUP_OPEN'
              }
            }
          }
        }
      }
    });
    
    console.log('Tournaments API would return:');
    tournaments.forEach(tournament => {
      console.log(`Tournament: ${tournament.name} (${tournament.games.length} games)`);
      tournament.games.forEach(game => {
        console.log(`  ${game.team1.shortName} vs ${game.team2.shortName} - ${game.contests.length} contests`);
      });
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();