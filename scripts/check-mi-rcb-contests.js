const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMIvRCBContests() {
  try {
    console.log('Checking MI v RCB contests...\n');
    
    // Find all MI v RCB contests
    const game = await prisma.iPLGame.findFirst({
      where: {
        homeTeam: 'MI',
        awayTeam: 'RCB'
      }
    });

    if (!game) {
      console.log('MI v RCB game not found!');
      return;
    }

    const contests = await prisma.contest.findMany({
      where: {
        iplGameId: game.id
      },
      include: {
        iplGame: {
          include: {
            tournament: true
          }
        },
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
            }
          }
        }
      }
    });

    console.log(`Found ${contests.length} MI v RCB contests\n`);

    contests.forEach(contest => {
      console.log(`Contest ID: ${contest.id}`);
      console.log(`Tournament: ${contest.iplGame.tournament.name}`);
      console.log(`Type: ${contest.type}`);
      console.log(`Entry Fee: ${contest.entryFee}`);
      console.log(`Status: ${contest.status}`);
      console.log(`Matchups: ${contest.matchups.length}`);
      
      contest.matchups.forEach((matchup, idx) => {
        console.log(`  Matchup ${idx + 1}: ${matchup.user1.user.username} vs ${matchup.user2.user.username} (${matchup.status})`);
      });
      
      console.log('---\n');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMIvRCBContests();
