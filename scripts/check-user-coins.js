const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserCoins() {
  try {
    const username = 'gunnerhari';
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        coinTransactions: {
          include: {
            contest: {
              include: {
                iplGame: {
                  include: {
                    team1: true,
                    team2: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        contestSignups: {
          include: {
            contest: {
              include: {
                iplGame: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log(`User ${username} not found`);
      return;
    }

    console.log('\n=== USER INFO ===');
    console.log(`Name: ${user.name}`);
    console.log(`Username: ${user.username}`);
    console.log(`Current Coins: ${user.coins}`);
    console.log(`Total Wins: ${user.totalWins}`);
    console.log(`Total Matches: ${user.totalMatches}`);

    console.log('\n=== CONTEST SIGNUPS ===');
    for (const signup of user.contestSignups) {
      console.log(`\nContest: ${signup.contest.iplGame?.title || 'Unknown'}`);
      console.log(`  Status: ${signup.contest.status}`);
      console.log(`  Contest ID: ${signup.contest.id}`);
      console.log(`  Coin Value: ${signup.contest.coinValue}`);
    }

    console.log('\n=== COIN TRANSACTIONS ===');
    if (user.coinTransactions.length === 0) {
      console.log('No transactions found!');
    } else {
      for (const tx of user.coinTransactions) {
        console.log(`\nDate: ${tx.createdAt.toLocaleString()}`);
        console.log(`  Type: ${tx.type}`);
        console.log(`  Amount: ${tx.amount}`);
        console.log(`  Balance After: ${tx.balance}`);
        console.log(`  Admin Fee: ${tx.adminFee}`);
        console.log(`  Description: ${tx.description}`);
        if (tx.contest) {
          console.log(`  Game: ${tx.contest.iplGame?.team1.shortName} vs ${tx.contest.iplGame?.team2.shortName}`);
        }
      }
    }

    // Check for any matchups
    console.log('\n=== MATCHUPS ===');
    const matchups = await prisma.headToHeadMatchup.findMany({
      where: {
        OR: [
          { user1: { userId: user.id } },
          { user2: { userId: user.id } }
        ]
      },
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true
              }
            }
          }
        },
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
    });

    if (matchups.length === 0) {
      console.log('No matchups found!');
    } else {
      for (const matchup of matchups) {
        console.log(`\nMatchup ID: ${matchup.id}`);
        console.log(`  Status: ${matchup.status}`);
        console.log(`  Contest Status: ${matchup.contest.status}`);
        console.log(`  Game: ${matchup.contest.iplGame.team1.shortName} vs ${matchup.contest.iplGame.team2.shortName}`);
        console.log(`  User 1: ${matchup.user1.user.name} - Score: ${matchup.user1Score}`);
        console.log(`  User 2: ${matchup.user2.user.name} - Score: ${matchup.user2Score}`);
        console.log(`  Coin Value: ${matchup.contest.coinValue}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCoins();
