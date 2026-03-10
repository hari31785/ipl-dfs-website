const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the bench swap calculation logic
function calculateTotalPointsWithSwap(userPicks, gameId) {
  const { finalLineup } = calculateFinalLineup(userPicks, gameId);
  return finalLineup.reduce((total, player) => total + player.points, 0);
}

function calculateFinalLineup(userPicks, gameId) {
  const starters = userPicks.filter(p => !p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  const bench = userPicks.filter(p => p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  
  let benchIndex = 0;
  const swappedOutPlayers = [];
  const usedBenchPlayerIds = new Set();
  
  const finalLineup = starters.map(starter => {
    const starterStats = starter.player.stats.find(s => s.iplGameId === gameId);
    
    if (starterStats?.didNotPlay && benchIndex < bench.length) {
      const benchPlayer = bench[benchIndex];
      benchIndex++;
      usedBenchPlayerIds.add(benchPlayer.playerId);
      
      const benchStats = benchPlayer.player.stats.find(s => s.iplGameId === gameId);
      
      swappedOutPlayers.push({
        ...starter,
        swappedOut: true,
        replacedBy: benchPlayer.player.name,
        points: starterStats?.points || 0
      });
      
      return {
        ...benchPlayer,
        swappedFor: starter.player.name,
        isSwapped: true,
        points: benchStats?.points || 0
      };
    }
    
    return {
      ...starter,
      isSwapped: false,
      points: starterStats?.points || 0
    };
  });
  
  const unusedBench = bench.filter(b => !usedBenchPlayerIds.has(b.playerId));
  const benchPlayers = [...swappedOutPlayers, ...unusedBench];
  
  return { finalLineup, benchPlayers };
}

async function reprocessContest() {
  try {
    const contestId = 'cmmju4c640007966r9cw5ppet'; // The DC vs GT contest
    
    console.log('\n=== REPROCESSING CONTEST ===\n');
    
    // Get the contest with all matchups
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
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
                player: {
                  include: {
                    stats: true
                  }
                }
              }
            }
          }
        },
        iplGame: true
      }
    });

    if (!contest) {
      console.log('Contest not found');
      return;
    }

    console.log(`Contest: ${contest.iplGame.title}`);
    console.log(`Status: ${contest.status}`);
    console.log(`Matchups: ${contest.matchups.length}\n`);

    for (const matchup of contest.matchups) {
      console.log(`\nProcessing matchup: ${matchup.id}`);
      
      const user1Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user1.id);
      const user2Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user2.id);

      const user1Score = calculateTotalPointsWithSwap(user1Picks, contest.iplGameId);
      const user2Score = calculateTotalPointsWithSwap(user2Picks, contest.iplGameId);

      console.log(`  ${matchup.user1.user.name}: ${user1Score} points`);
      console.log(`  ${matchup.user2.user.name}: ${user2Score} points`);
      console.log(`  Previous scores: ${matchup.user1Score} vs ${matchup.user2Score}`);

      // Update matchup scores
      await prisma.headToHeadMatchup.update({
        where: { id: matchup.id },
        data: {
          user1Score,
          user2Score,
          status: 'COMPLETED'
        }
      });

      console.log(`  ✓ Updated matchup scores`);

      // Determine winner and process coin transactions
      if (user1Score === user2Score) {
        console.log(`  Result: TIE - No coin transactions`);
        continue;
      }

      const winnerId = user1Score > user2Score ? matchup.user1.id : matchup.user2.id;
      const loserId = user1Score > user2Score ? matchup.user2.id : matchup.user1.id;
      const winnerUserId = user1Score > user2Score ? matchup.user1.user.id : matchup.user2.user.id;
      const loserUserId = user1Score > user2Score ? matchup.user2.user.id : matchup.user1.user.id;
      const winnerName = user1Score > user2Score ? matchup.user1.user.name : matchup.user2.user.name;
      const loserName = user1Score > user2Score ? matchup.user2.user.name : matchup.user1.user.name;

      const winnerScore = Math.max(user1Score, user2Score);
      const loserScore = Math.min(user1Score, user2Score);

      const coinValue = contest.coinValue;
      const scoreDifference = winnerScore - loserScore;
      const winnerGrossWinnings = scoreDifference * coinValue;
      const adminFee = Math.floor(winnerGrossWinnings * 0.1);
      const winnerNetWinnings = winnerGrossWinnings - adminFee;
      const loserAmount = -(scoreDifference * coinValue);

      console.log(`  Winner: ${winnerName} (+${winnerNetWinnings} coins)`);
      console.log(`  Loser: ${loserName} (${loserAmount} coins)`);
      console.log(`  Admin Fee: ${adminFee}`);

      // Get current balances
      const winner = await prisma.user.findUnique({ where: { id: winnerUserId } });
      const loser = await prisma.user.findUnique({ where: { id: loserUserId } });

      if (!winner || !loser) continue;

      // Update winner
      const newWinnerBalance = winner.coins + winnerNetWinnings;
      await prisma.user.update({
        where: { id: winnerUserId },
        data: { 
          coins: newWinnerBalance,
          totalWins: { increment: 1 },
          totalMatches: { increment: 1 }
        }
      });

      await prisma.coinTransaction.create({
        data: {
          userId: winnerUserId,
          amount: winnerNetWinnings,
          balance: newWinnerBalance,
          type: 'WIN',
          description: `Won contest (${contest.iplGame.title})`,
          matchupId: matchup.id,
          contestId: contest.id,
          adminFee: adminFee
        }
      });

      // Update loser
      const newLoserBalance = loser.coins + loserAmount;
      await prisma.user.update({
        where: { id: loserUserId },
        data: { 
          coins: newLoserBalance,
          totalMatches: { increment: 1 }
        }
      });

      await prisma.coinTransaction.create({
        data: {
          userId: loserUserId,
          amount: loserAmount,
          balance: newLoserBalance,
          type: 'LOSS',
          description: `Lost contest (${contest.iplGame.title})`,
          matchupId: matchup.id,
          contestId: contest.id,
          adminFee: 0
        }
      });

      // Update admin coins
      let adminCoins = await prisma.adminCoins.findFirst();
      if (!adminCoins) {
        adminCoins = await prisma.adminCoins.create({
          data: { totalCoins: 0 }
        });
      }

      await prisma.adminCoins.update({
        where: { id: adminCoins.id },
        data: { totalCoins: adminCoins.totalCoins + adminFee }
      });

      console.log(`  ✓ Coin transactions created`);
    }

    console.log('\n✅ Contest reprocessing complete!\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reprocessContest();
