import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils';

/**
 * POST /api/admin/matchups/[id]/resettle
 *
 * Re-evaluates a completed H2H matchup from scratch:
 *  1. Reverses all existing WIN/LOSS coin transactions for this matchup
 *  2. Reverses affected user balances, tournament balances, stats and admin fee
 *  3. Recalculates scores using the latest bench-swap logic
 *  4. Writes new coin transactions, updates matchup scores/winnerId and user stats
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchupId } = await params;

    // ─── 1. Fetch matchup with everything needed ──────────────────────────────
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: { include: { user: true } },
        user2: { include: { user: true } },
        draftPicks: {
          include: {
            player: { include: { stats: true } },
          },
        },
        contest: {
          include: {
            iplGame: {
              include: { tournament: true, team1: true, team2: true },
            },
          },
        },
      },
    });

    if (!matchup) {
      return NextResponse.json({ message: 'Matchup not found' }, { status: 404 });
    }

    if (matchup.status !== 'COMPLETED') {
      return NextResponse.json(
        { message: 'Only COMPLETED matchups can be re-settled' },
        { status: 400 }
      );
    }

    const contest = matchup.contest;
    const { iplGame } = contest;
    const tournamentId = iplGame.tournamentId;

    // ─── 2. Load existing transactions for this matchup ───────────────────────
    const existingTransactions = await prisma.coinTransaction.findMany({
      where: {
        matchupId,
        type: { in: ['WIN', 'LOSS'] },
      },
    });

    // ─── 3. Reverse old transactions ─────────────────────────────────────────
    for (const tx of existingTransactions) {
      const user = await prisma.user.findUnique({ where: { id: tx.userId } });
      if (!user) continue;

      // Reverse the coin balance
      await prisma.user.update({
        where: { id: tx.userId },
        data: { coins: user.coins - tx.amount },
      });

      // Reverse tournament balance
      const tb = await prisma.tournamentBalance.findUnique({
        where: { userId_tournamentId: { userId: tx.userId, tournamentId } },
      });
      if (tb) {
        await prisma.tournamentBalance.update({
          where: { userId_tournamentId: { userId: tx.userId, tournamentId } },
          data: { balance: tb.balance - tx.amount },
        });
      }

      // Reverse win stats
      if (tx.type === 'WIN') {
        const refreshed = await prisma.user.findUnique({ where: { id: tx.userId } });
        if (refreshed) {
          const newTotalWins = Math.max(0, refreshed.totalWins - 1);
          const newTotalMatches = Math.max(0, refreshed.totalMatches - 1);
          const newWinPct = newTotalMatches > 0 ? (newTotalWins / newTotalMatches) * 100 : 0;
          await prisma.user.update({
            where: { id: tx.userId },
            data: { totalWins: newTotalWins, totalMatches: newTotalMatches, winPercentage: newWinPct },
          });
        }

        // Reverse admin fee from admin coins
        const adminFee = tx.adminFee ?? 0;
        if (adminFee > 0) {
          const adminCoins = await prisma.adminCoins.findFirst();
          if (adminCoins) {
            await prisma.adminCoins.update({
              where: { id: adminCoins.id },
              data: { totalCoins: Math.max(0, adminCoins.totalCoins - adminFee) },
            });
          }
        }
      } else if (tx.type === 'LOSS') {
        // Reverse totalMatches only (no win stat for losers)
        const refreshed = await prisma.user.findUnique({ where: { id: tx.userId } });
        if (refreshed) {
          const newTotalMatches = Math.max(0, refreshed.totalMatches - 1);
          const newWinPct = newTotalMatches > 0 ? (refreshed.totalWins / newTotalMatches) * 100 : 0;
          await prisma.user.update({
            where: { id: tx.userId },
            data: { totalMatches: newTotalMatches, winPercentage: newWinPct },
          });
        }
      }
    }

    // Delete old transactions
    await prisma.coinTransaction.deleteMany({
      where: { matchupId, type: { in: ['WIN', 'LOSS'] } },
    });

    // ─── 4. Recalculate scores ────────────────────────────────────────────────
    const user1Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user1.id);
    const user2Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user2.id);

    const user1Score = calculateTotalPointsWithSwap(user1Picks, contest.iplGameId);
    const user2Score = calculateTotalPointsWithSwap(user2Picks, contest.iplGameId);

    // Determine winner
    let winnerId: string | null = null;
    let winnerSignupId: string | null = null;
    let loserSignupId: string | null = null;
    let winnerUserId: string | null = null;
    let loserUserId: string | null = null;

    if (user1Score > user2Score) {
      winnerId = matchup.user1.id;
      winnerSignupId = matchup.user1.id;
      loserSignupId = matchup.user2.id;
      winnerUserId = matchup.user1.user.id;
      loserUserId = matchup.user2.user.id;
    } else if (user2Score > user1Score) {
      winnerId = matchup.user2.id;
      winnerSignupId = matchup.user2.id;
      loserSignupId = matchup.user1.id;
      winnerUserId = matchup.user2.user.id;
      loserUserId = matchup.user1.user.id;
    }
    // else tie — winnerId stays null

    // ─── 5. Update matchup record ─────────────────────────────────────────────
    await prisma.headToHeadMatchup.update({
      where: { id: matchupId },
      data: { user1Score, user2Score, winnerId, status: 'COMPLETED' },
    });

    // ─── 6. Re-apply new coin transactions (non-tie only) ─────────────────────
    let adminFeeCollected = 0;

    if (winnerUserId && loserUserId && winnerSignupId && loserSignupId) {
      const winnerScore = Math.max(user1Score, user2Score);
      const loserScore = Math.min(user1Score, user2Score);
      const { coinValue } = contest;

      const winnerGrossWinnings = (winnerScore - loserScore) * coinValue;
      const adminFee = Math.floor(winnerGrossWinnings * 0.1);
      const winnerNetWinnings = winnerGrossWinnings - adminFee;
      const loserAmount = (loserScore - winnerScore) * coinValue; // negative

      // Winner
      const winner = await prisma.user.findUnique({ where: { id: winnerUserId } });
      if (winner) {
        const newBalance = winner.coins + winnerNetWinnings;
        const newTotalWins = winner.totalWins + 1;
        const newTotalMatches = winner.totalMatches + 1;
        const newWinPct = newTotalMatches > 0 ? (newTotalWins / newTotalMatches) * 100 : 0;

        await prisma.user.update({
          where: { id: winnerUserId },
          data: { coins: newBalance, totalWins: newTotalWins, totalMatches: newTotalMatches, winPercentage: newWinPct },
        });

        const winnerTB = await prisma.tournamentBalance.findUnique({
          where: { userId_tournamentId: { userId: winnerUserId, tournamentId } },
        });
        const newWinnerTBBalance = (winnerTB?.balance ?? 0) + winnerNetWinnings;
        await prisma.tournamentBalance.upsert({
          where: { userId_tournamentId: { userId: winnerUserId, tournamentId } },
          update: { balance: newWinnerTBBalance },
          create: { userId: winnerUserId, tournamentId, balance: newWinnerTBBalance },
        });

        await prisma.coinTransaction.create({
          data: {
            userId: winnerUserId,
            tournamentId,
            amount: winnerNetWinnings,
            balance: newWinnerTBBalance,
            type: 'WIN',
            description: `Won contest [re-settled] (${iplGame.title})`,
            matchupId,
            contestId: contest.id,
            adminFee,
          },
        });
      }

      // Loser
      const loser = await prisma.user.findUnique({ where: { id: loserUserId } });
      if (loser) {
        const newBalance = loser.coins + loserAmount;
        const newTotalMatches = loser.totalMatches + 1;
        const newWinPct = newTotalMatches > 0 ? (loser.totalWins / newTotalMatches) * 100 : 0;

        await prisma.user.update({
          where: { id: loserUserId },
          data: { coins: newBalance, totalMatches: newTotalMatches, winPercentage: newWinPct },
        });

        const loserTB = await prisma.tournamentBalance.findUnique({
          where: { userId_tournamentId: { userId: loserUserId, tournamentId } },
        });
        const newLoserTBBalance = (loserTB?.balance ?? 0) + loserAmount;
        await prisma.tournamentBalance.upsert({
          where: { userId_tournamentId: { userId: loserUserId, tournamentId } },
          update: { balance: newLoserTBBalance },
          create: { userId: loserUserId, tournamentId, balance: newLoserTBBalance },
        });

        await prisma.coinTransaction.create({
          data: {
            userId: loserUserId,
            tournamentId,
            amount: loserAmount,
            balance: newLoserTBBalance,
            type: 'LOSS',
            description: `Lost contest [re-settled] (${iplGame.title})`,
            matchupId,
            contestId: contest.id,
            adminFee: 0,
          },
        });
      }

      // Admin fee
      if (adminFee > 0) {
        adminFeeCollected = adminFee;
        const adminCoins = await prisma.adminCoins.findFirst();
        if (adminCoins) {
          await prisma.adminCoins.update({
            where: { id: adminCoins.id },
            data: { totalCoins: adminCoins.totalCoins + adminFee },
          });
        }
      }
    }

    const resultLabel =
      winnerId === null
        ? 'Tie'
        : winnerId === matchup.user1.id
        ? `${matchup.user1.user.username} won`
        : `${matchup.user2.user.username} won`;

    return NextResponse.json({
      success: true,
      matchupId,
      user1Score,
      user2Score,
      result: resultLabel,
      adminFeeCollected,
      reversedTransactions: existingTransactions.length,
    });
  } catch (error) {
    console.error('Error re-settling matchup:', error);
    return NextResponse.json(
      { message: 'Failed to re-settle matchup', error: String(error) },
      { status: 500 }
    );
  }
}
