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
    
    if (starterStats?.didNotPlay) {
      while (benchIndex < bench.length) {
        const benchPlayer = bench[benchIndex];
        benchIndex++;
        const benchStats = benchPlayer.player.stats.find(s => s.iplGameId === gameId);
        
        if (!benchStats?.didNotPlay) {
          usedBenchPlayerIds.add(benchPlayer.playerId);
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
        // bench player is also DNP — skip and try next
      }
      // no available bench player
      swappedOutPlayers.push({ ...starter, swappedOut: true, replacedBy: null, points: 0 });
      return { ...starter, isSwapped: false, points: 0 };
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

async function recalculateContest() {
  try {
    const contestId = 'cmmju4c640007966r9cw5ppet';
    
    console.log('\n=== RECALCULATING CONTEST WITH UPDATED STATS ===\n');
    
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

    for (const matchup of contest.matchups) {
      console.log(`\nMatchup: ${matchup.id}`);
      
      const user1Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user1.id);
      const user2Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user2.id);

      // Calculate current scores with all stats
      const user1Score = calculateTotalPointsWithSwap(user1Picks, contest.iplGameId);
      const user2Score = calculateTotalPointsWithSwap(user2Picks, contest.iplGameId);

      console.log(`Current stored scores: ${matchup.user1.user.name}=${matchup.user1Score}, ${matchup.user2.user.name}=${matchup.user2Score}`);
      console.log(`Actual scores with current stats: ${matchup.user1.user.name}=${user1Score}, ${matchup.user2.user.name}=${user2Score}`);

      if (user1Score === matchup.user1Score && user2Score === matchup.user2Score) {
        console.log('✓ Scores match - no recalculation needed');
        continue;
      }

      console.log('\n⚠️  Scores have changed! Recalculating...');

      // Delete existing coin transactions for this matchup
      const deletedTxns = await prisma.coinTransaction.deleteMany({
        where: { matchupId: matchup.id }
      });
      console.log(`  Deleted ${deletedTxns.count} old transactions`);

      // Reverse the old win/loss counts and coins
      if (matchup.user1Score > matchup.user2Score) {
        await prisma.user.update({
          where: { id: matchup.user1.user.id },
          data: { 
            totalWins: { decrement: 1 },
            totalMatches: { decrement: 1 }
          }
        });
        await prisma.user.update({
          where: { id: matchup.user2.user.id },
          data: { 
            totalMatches: { decrement: 1 }
          }
        });
      } else if (matchup.user2Score > matchup.user1Score) {
        await prisma.user.update({
          where: { id: matchup.user2.user.id },
          data: { 
            totalWins: { decrement: 1 },
            totalMatches: { decrement: 1 }
          }
        });
        await prisma.user.update({
          where: { id: matchup.user1.user.id },
          data: { 
            totalMatches: { decrement: 1 }
          }
        });
      }

      // Update matchup with new scores
      await prisma.headToHeadMatchup.update({
        where: { id: matchup.id },
        data: {
          user1Score,
          user2Score
        }
      });
      console.log(`  ✓ Updated matchup scores`);

      // Recalculate and create new transactions
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
      const scoreDifference = winnerScore - loserScore;

      const coinValue = contest.coinValue;
      const winnerGrossWinnings = scoreDifference * coinValue;
      const adminFee = Math.floor(winnerGrossWinnings * 0.1);
      const winnerNetWinnings = winnerGrossWinnings - adminFee;
      const loserAmount = -(scoreDifference * coinValue);

      console.log(`\n  New calculation:`);
      console.log(`    Winner: ${winnerName} (${winnerScore} pts)`);
      console.log(`    Loser: ${loserName} (${loserScore} pts)`);
      console.log(`    Score difference: ${scoreDifference}`);
      console.log(`    Gross winnings: ${scoreDifference} × ${coinValue} = ${winnerGrossWinnings}`);
      console.log(`    Admin fee (10%): ${adminFee}`);
      console.log(`    Net winnings: ${winnerNetWinnings}`);
      console.log(`    Loser amount: ${loserAmount}`);

      // Get current balances
      const winner = await prisma.user.findUnique({ where: { id: winnerUserId } });
      const loser = await prisma.user.findUnique({ where: { id: loserUserId } });

      if (!winner || !loser) continue;

      // Calculate the difference in coins from old to new
      const oldWinnerGross = matchup.user1Score > matchup.user2Score 
        ? (matchup.user1Score - matchup.user2Score) * coinValue
        : matchup.user2Score > matchup.user1Score
        ? (matchup.user2Score - matchup.user1Score) * coinValue
        : 0;
      const oldAdminFee = Math.floor(oldWinnerGross * 0.1);
      const oldWinnerNet = oldWinnerGross - oldAdminFee;
      const oldLoserAmount = matchup.user1Score > matchup.user2Score 
        ? -((matchup.user1Score - matchup.user2Score) * coinValue)
        : matchup.user2Score > matchup.user1Score
        ? -((matchup.user2Score - matchup.user1Score) * coinValue)
        : 0;

      const coinDiffWinner = winnerNetWinnings - oldWinnerNet;
      const coinDiffLoser = loserAmount - oldLoserAmount;
      const adminFeeDiff = adminFee - oldAdminFee;

      // Update winner
      const newWinnerBalance = winner.coins + coinDiffWinner;
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
      const newLoserBalance = loser.coins + coinDiffLoser;
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
      if (adminCoins) {
        await prisma.adminCoins.update({
          where: { id: adminCoins.id },
          data: { totalCoins: adminCoins.totalCoins + adminFeeDiff }
        });
      }

      console.log(`  ✓ New coin transactions created`);
      console.log(`  Winner balance: ${winner.coins} → ${newWinnerBalance} (${coinDiffWinner > 0 ? '+' : ''}${coinDiffWinner})`);
      console.log(`  Loser balance: ${loser.coins} → ${newLoserBalance} (${coinDiffLoser})`);
    }

    console.log('\n✅ Contest recalculation complete!\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateContest();
