import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils';
import { sendToUser } from '@/lib/pushNotifications';


// POST /api/admin/contests/[id]/end - End contest and settle coin transactions
// Query params: ?force=true to bypass stats validation (use with caution)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;
    const { searchParams } = new URL(request.url);
    const forceEnd = searchParams.get('force') === 'true';

    // Get the contest with all matchups and their picks
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
        iplGame: {
          include: {
            tournament: true,
            team1: true,
            team2: true
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    if (contest.status !== 'LIVE' && contest.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Contest must be in LIVE or ACTIVE status to end' },
        { status: 400 }
      );
    }

    // RISK MITIGATION: Check if player stats are populated for this game
    const statsCount = await prisma.playerStat.count({
      where: { iplGameId: contest.iplGameId }
    });

    if (statsCount === 0 && !forceEnd) {
      return NextResponse.json(
        { 
          message: 'Cannot end contest: No player stats have been entered for this game yet. Please enter stats first.',
          error: 'NO_STATS',
          canForce: true
        },
        { status: 400 }
      );
    }

    // Additional check: Verify that stats exist for players in the matchups
    let totalPlayersInMatchups = 0;
    let playersWithStats = 0;

    for (const matchup of contest.matchups) {
      const allPicks = matchup.draftPicks;
      totalPlayersInMatchups += allPicks.length;
      
      for (const pick of allPicks) {
        const hasStats = pick.player.stats.some(s => s.iplGameId === contest.iplGameId);
        if (hasStats) playersWithStats++;
      }
    }

    // If less than 50% of players have stats, warn the admin
    const statsPercentage = totalPlayersInMatchups > 0 ? (playersWithStats / totalPlayersInMatchups) * 100 : 0;
    
    if (statsPercentage < 50 && !forceEnd) {
      return NextResponse.json(
        { 
          message: `Cannot end contest: Only ${playersWithStats} out of ${totalPlayersInMatchups} players have stats entered (${statsPercentage.toFixed(1)}%). Please enter stats for all players before ending the contest.`,
          error: 'INSUFFICIENT_STATS',
          canForce: true,
          details: {
            totalPlayers: totalPlayersInMatchups,
            playersWithStats,
            percentage: statsPercentage.toFixed(1)
          }
        },
        { status: 400 }
      );
    }

    // Warning if force-ending with incomplete stats
    if (forceEnd && (statsCount === 0 || statsPercentage < 50)) {
      console.warn(`⚠️ FORCE ENDING contest ${contestId} with incomplete stats. Stats: ${playersWithStats}/${totalPlayersInMatchups} (${statsPercentage.toFixed(1)}%)`);
    }

    let winnersPaid = 0;
    let losersCharged = 0;
    let adminFeeCollected = 0;
    const computedWinnerIds = new Map<string, string | null>(); // matchupId -> winnerId (ContestSignup ID)

    // Process each matchup
    for (const matchup of contest.matchups) {
      // Calculate scores for both users using bench swap logic
      const user1Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user1.id);
      const user2Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user2.id);

      // Use the bench swap utility to calculate correct scores (only active 5 players count)
      const user1Score = calculateTotalPointsWithSwap(user1Picks, contest.iplGameId);
      const user2Score = calculateTotalPointsWithSwap(user2Picks, contest.iplGameId);

      // Update matchup with calculated scores
      await prisma.headToHeadMatchup.update({
        where: { id: matchup.id },
        data: {
          user1Score,
          user2Score,
          status: 'COMPLETED'
        }
      });

      // Determine winner and loser
      let winnerId: string | null = null;
      let loserId: string | null = null;
      let winnerUserId: string;
      let loserUserId: string;

      if (user1Score > user2Score) {
        winnerId = matchup.user1.id;
        loserId = matchup.user2.id;
        winnerUserId = matchup.user1.user.id;
        loserUserId = matchup.user2.user.id;
      } else if (user2Score > user1Score) {
        winnerId = matchup.user2.id;
        loserId = matchup.user1.id;
        winnerUserId = matchup.user2.user.id;
        loserUserId = matchup.user1.user.id;
      } else {
        // Tie - no coin transactions, winnerId stays null
        computedWinnerIds.set(matchup.id, null);
        continue;
      }

      // Save winnerId to the matchup record
      await prisma.headToHeadMatchup.update({
        where: { id: matchup.id },
        data: { winnerId }
      });
      computedWinnerIds.set(matchup.id, winnerId);

      const coinValue = contest.coinValue;
      const winnerScore = user1Score > user2Score ? user1Score : user2Score;
      const loserScore = user1Score > user2Score ? user2Score : user1Score;
      
      // Calculate winnings for winner (positive)
      const winnerScoreDifference = winnerScore - loserScore;
      const winnerGrossWinnings = winnerScoreDifference * coinValue;
      const adminFee = Math.floor(winnerGrossWinnings * 0.1); // 10% admin fee on winnings only
      const winnerNetWinnings = winnerGrossWinnings - adminFee;
      
      // Calculate loss for loser (negative, same formula but no admin fee)
      const loserScoreDifference = loserScore - winnerScore; // This will be negative
      const loserAmount = loserScoreDifference * coinValue; // This will be negative

      // Get current balances
      const winner = await prisma.user.findUnique({ where: { id: winnerUserId } });
      const loser = await prisma.user.findUnique({ where: { id: loserUserId } });

      if (!winner || !loser) continue;

      // Update winner's balance
      const newWinnerBalance = winner.coins + winnerNetWinnings;
      const newWinnerTotalWins = winner.totalWins + 1;
      const newWinnerTotalMatches = winner.totalMatches + 1;
      const newWinnerWinPercentage = newWinnerTotalMatches > 0 ? (newWinnerTotalWins / newWinnerTotalMatches) * 100 : 0;
      
      await prisma.user.update({
        where: { id: winnerUserId },
        data: { 
          coins: newWinnerBalance,
          totalWins: newWinnerTotalWins,
          totalMatches: newWinnerTotalMatches,
          winPercentage: newWinnerWinPercentage
        }
      });

      // Update winner's tournament balance
      const winnerTournamentBalance = await prisma.tournamentBalance.findUnique({
        where: {
          userId_tournamentId: {
            userId: winnerUserId,
            tournamentId: contest.iplGame.tournamentId
          }
        }
      });

      const newWinnerTournamentBalance = (winnerTournamentBalance?.balance || 0) + winnerNetWinnings;
      await prisma.tournamentBalance.upsert({
        where: {
          userId_tournamentId: {
            userId: winnerUserId,
            tournamentId: contest.iplGame.tournamentId
          }
        },
        update: {
          balance: newWinnerTournamentBalance
        },
        create: {
          userId: winnerUserId,
          tournamentId: contest.iplGame.tournamentId,
          balance: newWinnerTournamentBalance
        }
      });

      // Create winner transaction
      await prisma.coinTransaction.create({
        data: {
          userId: winnerUserId,
          tournamentId: contest.iplGame.tournamentId,
          amount: winnerNetWinnings,
          balance: newWinnerTournamentBalance,
          type: 'WIN',
          description: `Won contest (${contest.iplGame.title})`,
          matchupId: matchup.id,
          contestId: contest.id,
          adminFee: adminFee
        }
      });

      // Update loser's balance (loses based on score difference formula)
      const newLoserBalance = loser.coins + loserAmount; // loserAmount is already negative
      const newLoserTotalMatches = loser.totalMatches + 1;
      const newLoserWinPercentage = newLoserTotalMatches > 0 ? (loser.totalWins / newLoserTotalMatches) * 100 : 0;
      
      await prisma.user.update({
        where: { id: loserUserId },
        data: { 
          coins: newLoserBalance,
          totalMatches: newLoserTotalMatches,
          winPercentage: newLoserWinPercentage
        }
      });

      // Update loser's tournament balance
      const loserTournamentBalance = await prisma.tournamentBalance.findUnique({
        where: {
          userId_tournamentId: {
            userId: loserUserId,
            tournamentId: contest.iplGame.tournamentId
          }
        }
      });

      const newLoserTournamentBalance = (loserTournamentBalance?.balance || 0) + loserAmount;
      await prisma.tournamentBalance.upsert({
        where: {
          userId_tournamentId: {
            userId: loserUserId,
            tournamentId: contest.iplGame.tournamentId
          }
        },
        update: {
          balance: newLoserTournamentBalance
        },
        create: {
          userId: loserUserId,
          tournamentId: contest.iplGame.tournamentId,
          balance: newLoserTournamentBalance
        }
      });

      // Create loser transaction
      await prisma.coinTransaction.create({
        data: {
          userId: loserUserId,
          tournamentId: contest.iplGame.tournamentId,
          amount: loserAmount, // Already negative
          balance: newLoserTournamentBalance,
          type: 'LOSS',
          description: `Lost contest (${contest.iplGame.title})`,
          matchupId: matchup.id,
          contestId: contest.id,
          adminFee: 0 // No admin fee for losers
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

      winnersPaid++;
      losersCharged++;
      adminFeeCollected += adminFee;
    }

    // Update contest status to COMPLETED
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: 'COMPLETED' }
    });

    // Push notifications: tell each user their result
    for (const matchup of contest.matchups) {
      const u1 = matchup.user1.user;
      const u2 = matchup.user2.user;
      const gameTitle = `${contest.iplGame.team1?.shortName ?? ''} vs ${contest.iplGame.team2?.shortName ?? ''}`;
      const coinLabel = `${contest.coinValue}-coin`;
      const resolvedWinnerId = computedWinnerIds.has(matchup.id) ? computedWinnerIds.get(matchup.id) : null;
      const isTie = resolvedWinnerId === undefined || resolvedWinnerId === null;

      const getTitle = (won: boolean) => {
        if (isTie) return '🤝 It\'s a tie!';
        return won ? '🏆 You won!' : '😔 Better luck next time';
      };
      const getBody = (won: boolean, opponent: string) => {
        const contestLabel = `${gameTitle} ${coinLabel} contest`;
        if (isTie) return `You tied with ${opponent} in the ${contestLabel}. Log in to check your scores.`;
        if (won) return `You beat ${opponent} in the ${contestLabel}. Log in to check your scores!`;
        return `You lost to ${opponent} in the ${contestLabel}. Log in to check your scores.`;
      };

      await sendToUser(u1.id, {
        title: getTitle(resolvedWinnerId === matchup.user1Id),
        body: getBody(resolvedWinnerId === matchup.user1Id, u2.username),
        icon: '/icon-192.png',
        url: `/scores/${matchup.id}?from=completed`,
      });
      await sendToUser(u2.id, {
        title: getTitle(resolvedWinnerId === matchup.user2Id),
        body: getBody(resolvedWinnerId === matchup.user2Id, u1.username),
        icon: '/icon-192.png',
        url: `/scores/${matchup.id}?from=completed`,
      });
    }

    // Purge the leaderboard edge cache for this tournament so the next
    // request fetches fresh standings (leaderboard only changes on contest end)
    revalidatePath(`/api/tournaments/${contest.iplGame.tournament.id}/leaderboard`);

    return NextResponse.json({
      success: true,
      totalMatchups: contest.matchups.length,
      winnersPaid,
      losersCharged,
      adminFeeCollected
    });

  } catch (error) {
    console.error('Error ending contest:', error);
    return NextResponse.json(
      { message: 'Failed to end contest', error: String(error) },
      { status: 500 }
    );
  }
}
