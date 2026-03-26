const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMatchupsAPI() {
  try {
    const contestId = 'cmn6t9sfi0005si8pw4tt0qmw'; // The SIGNUP_CLOSED one with 50 point entry
    
    console.log(`Testing matchups API for contest: ${contestId}\n`);
    
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true,
            tournament: true
          }
        },
        matchups: {
          include: {
            user1: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true
                  }
                }
              }
            },
            user2: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true
                  }
                }
              }
            },
            draftPicks: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                }
              },
              orderBy: {
                pickOrder: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            signups: true,
            matchups: true
          }
        }
      }
    });

    if (!contest) {
      console.log('Contest not found!');
      return;
    }

    console.log('Contest found!');
    console.log(`Game: ${contest.iplGame.team1?.shortName || contest.iplGame.homeTeam} vs ${contest.iplGame.team2?.shortName || contest.iplGame.awayTeam}`);
    console.log(`Tournament: ${contest.iplGame.tournament?.name || 'N/A'}`);
    console.log(`Type: ${contest.type}`);
    console.log(`Entry Fee: ${contest.entryFee}`);
    console.log(`Status: ${contest.status}`);
    console.log(`Signups: ${contest._count.signups}`);
    console.log(`Matchups: ${contest._count.matchups}`);
    console.log('');
    
    contest.matchups.forEach((matchup, idx) => {
      console.log(`Matchup ${idx + 1}:`);
      console.log(`  User 1: ${matchup.user1.user.username}`);
      console.log(`  User 2: ${matchup.user2.user.username}`);
      console.log(`  Status: ${matchup.status}`);
      console.log(`  First Pick: ${matchup.firstPickUser || 'NULL'}`);
      console.log(`  Draft Picks: ${matchup.draftPicks.length}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMatchupsAPI();
