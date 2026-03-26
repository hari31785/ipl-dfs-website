const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPI() {
  try {
    // Find gunnerhari
    const user = await prisma.user.findUnique({
      where: {
        username: 'gunnerhari'
      }
    });

    console.log(`Testing for user: ${user.username} (${user.id})\n`);

    // This mimics the /api/user/contests endpoint
    const signups = await prisma.contestSignup.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        signupAt: 'desc'
      },
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true,
                tournament: true
              }
            }
          }
        },
        user: true,
        matchupsAsUser1: {
          include: {
            user2: {
              include: {
                user: true
              }
            },
            draftPicks: {
              include: {
                player: {
                  include: {
                    stats: true
                  }
                }
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
            },
            draftPicks: {
              include: {
                player: {
                  include: {
                    stats: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`Total signups: ${signups.length}\n`);

    // Filter for Test Tournament only
    const testTournamentSignups = signups.filter(
      s => s.contest.iplGame.tournament.name === 'Test Tournament'
    );

    console.log(`Test Tournament signups: ${testTournamentSignups.length}\n`);

    testTournamentSignups.forEach(signup => {
      const matchup = signup.matchupsAsUser1[0] || signup.matchupsAsUser2[0] || null;
      
      console.log(`Contest ID: ${signup.contest.id}`);
      console.log(`Game: ${signup.contest.iplGame.team1?.shortName || signup.contest.iplGame.homeTeam} vs ${signup.contest.iplGame.team2?.shortName || signup.contest.iplGame.awayTeam}`);
      console.log(`Contest Status: ${signup.contest.status}`);
      console.log(`Contest Type: ${signup.contest.type}`);
      console.log(`Has Matchup: ${matchup ? 'YES' : 'NO'}`);
      
      if (matchup) {
        const opponent = signup.matchupsAsUser1[0] 
          ? matchup.user2.user.username 
          : matchup.user1.user.username;
        console.log(`  Opponent: ${opponent}`);
        console.log(`  Matchup Status: ${matchup.status}`);
        console.log(`  First Pick User: ${matchup.firstPickUser || 'NULL (will trigger toss)'}`);
        console.log(`  Draft Picks: ${matchup.draftPicks.length}`);
      }
      
      console.log('---\n');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
