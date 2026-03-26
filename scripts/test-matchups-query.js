const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMatchupsQuery() {
  try {
    const id = 'cmn6t9sfi0005si8pw4tt0qmw';
    
    console.log(`Testing query for contest: ${id}\n`);
    
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
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
                  include: {
                    iplTeam: true
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

    console.log('✅ Query successful!');
    console.log(`Game: ${contest.iplGame.title}`);
    console.log(`Team1: ${contest.iplGame.team1?.shortName}`);
    console.log(`Team2: ${contest.iplGame.team2?.shortName}`);
    console.log(`Status: ${contest.status}`);
    console.log(`Matchups: ${contest.matchups.length}`);
    console.log(`Signups: ${contest._count.signups}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testMatchupsQuery();
