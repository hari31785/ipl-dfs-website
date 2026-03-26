const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserContests() {
  try {
    console.log('Checking user contests for gunnerhari...\n');
    
    // Find gunnerhari
    const user = await prisma.user.findUnique({
      where: {
        username: 'gunnerhari'
      }
    });

    if (!user) {
      console.log('User gunnerhari not found!');
      return;
    }

    // Find all contest signups for this user
    const signups = await prisma.contestSignup.findMany({
      where: {
        userId: user.id
      },
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                tournament: true,
                team1: true,
                team2: true
              }
            }
          }
        },
        matchupsAsUser1: {
          include: {
            user2: {
              include: {
                user: true
              }
            }
          }
        },
        matchupsAsUser2: {
          include: {
            user1: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${signups.length} contest signups for gunnerhari\n`);

    signups.forEach(signup => {
      const matchups = [...signup.matchupsAsUser1, ...signup.matchupsAsUser2];
      console.log(`Contest: ${signup.contest.iplGame.team1?.shortName || signup.contest.iplGame.homeTeam} vs ${signup.contest.iplGame.team2?.shortName || signup.contest.iplGame.awayTeam}`);
      console.log(`  Tournament: ${signup.contest.iplGame.tournament.name}`);
      console.log(`  Contest Type: ${signup.contest.type}`);
      console.log(`  Contest Status: ${signup.contest.status}`);
      console.log(`  Matchups: ${matchups.length}`);
      
      matchups.forEach(matchup => {
        const opponent = matchup.user1Id === signup.id 
          ? matchup.user2.user.username 
          : matchup.user1.user.username;
        console.log(`    vs ${opponent} - Status: ${matchup.status}, FirstPick: ${matchup.firstPickUser || 'NULL'}`);
      });
      
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserContests();
