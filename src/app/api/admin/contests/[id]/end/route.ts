import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils';

const prisma = new PrismaClient();

// POST /api/admin/contests/[id]/end - End contest and settle coin transactions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;

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
        iplGame: true
      }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    if (contest.status !== 'LIVE') {
      return NextResponse.json(
        { message: 'Contest must be in LIVE status to end' },
        { status: 400 }
      );
    }

    let winnersPaid = 0;
    let losersCharged = 0;
    let adminFeeCollected = 0;

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
        // Tie - no coin transactions
        continue;
      }

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
      await prisma.user.update({
        where: { id: winnerUserId },
        data: { 
          coins: newWinnerBalance,
          totalWins: { increment: 1 },
          totalMatches: { increment: 1 }
        }
      });

      // Create winner transaction
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

      // Update loser's balance (loses based on score difference formula)
      const newLoserBalance = loser.coins + loserAmount; // loserAmount is already negative
      await prisma.user.update({
        where: { id: loserUserId },
        data: { 
          coins: newLoserBalance,
          totalMatches: { increment: 1 }
        }
      });

      // Create loser transaction
      await prisma.coinTransaction.create({
        data: {
          userId: loserUserId,
          amount: loserAmount, // Already negative
          balance: newLoserBalance,
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
