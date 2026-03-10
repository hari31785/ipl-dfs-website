const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMatchupDetails() {
  try {
    const matchupId = 'cmmjuv5v3000d966rv4xvk9hv';
    
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
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
        },
        draftPicks: {
          include: {
            player: {
              include: {
                iplTeam: true,
                stats: {
                  where: {
                    iplGameId: 'cmmju3vq80006966rknwvljpp' // The game ID
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!matchup) {
      console.log('Matchup not found');
      return;
    }

    console.log('\n=== MATCHUP DETAILS ===');
    console.log(`Status: ${matchup.status}`);
    console.log(`Contest Status: ${matchup.contest.status}`);
    console.log(`Game: ${matchup.contest.iplGame.team1.shortName} vs ${matchup.contest.iplGame.team2.shortName}`);
    console.log(`Game ID: ${matchup.contest.iplGameId}`);
    console.log(`\nUser 1: ${matchup.user1.user.name} (Score: ${matchup.user1Score})`);
    console.log(`User 2: ${matchup.user2.user.name} (Score: ${matchup.user2Score})`);

    console.log('\n=== DRAFT PICKS ===');
    const user1Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user1.id);
    const user2Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user2.id);

    console.log(`\n${matchup.user1.user.name}'s Picks (${user1Picks.length} total):`);
    for (const pick of user1Picks) {
      const stats = pick.player.stats[0];
      console.log(`  Pick ${pick.pickOrder}: ${pick.player.name} (${pick.player.iplTeam.shortName})`);
      console.log(`    Bench: ${pick.isBench}`);
      if (stats) {
        console.log(`    Stats: Runs=${stats.runs}, Wickets=${stats.wickets}, Catches=${stats.catches}, DNP=${stats.didNotPlay}, Points=${stats.points}`);
      } else {
        console.log(`    Stats: NO STATS FOUND`);
      }
    }

    console.log(`\n${matchup.user2.user.name}'s Picks (${user2Picks.length} total):`);
    for (const pick of user2Picks) {
      const stats = pick.player.stats[0];
      console.log(`  Pick ${pick.pickOrder}: ${pick.player.name} (${pick.player.iplTeam.shortName})`);
      console.log(`    Bench: ${pick.isBench}`);
      if (stats) {
        console.log(`    Stats: Runs=${stats.runs}, Wickets=${stats.wickets}, Catches=${stats.catches}, DNP=${stats.didNotPlay}, Points=${stats.points}`);
      } else {
        console.log(`    Stats: NO STATS FOUND`);
      }
    }

    // Calculate what the scores SHOULD be
    console.log('\n=== SCORE CALCULATION ===');
    let user1Total = 0;
    let user2Total = 0;

    for (const pick of user1Picks) {
      if (!pick.isBench && pick.player.stats[0]) {
        user1Total += pick.player.stats[0].points;
      }
    }

    for (const pick of user2Picks) {
      if (!pick.isBench && pick.player.stats[0]) {
        user2Total += pick.player.stats[0].points;
      }
    }

    console.log(`${matchup.user1.user.name} should have: ${user1Total} points`);
    console.log(`${matchup.user2.user.name} should have: ${user2Total} points`);
    console.log(`\nStored in DB: User1=${matchup.user1Score}, User2=${matchup.user2Score}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMatchupDetails();
