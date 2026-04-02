import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils';

/**
 * POST /api/admin/games/[gameId]/recertify
 *
 * Re-settles ALL completed matchups across every COMPLETED contest under a
 * given IPL game. Useful when player stats are corrected after a game ends.
 *
 * For each completed matchup it:
 *  1. Reverses existing WIN/LOSS transactions (coins, tournament balances, stats, admin fee)
 *  2. Recalculates scores using current stats + bench-swap logic
 *  3. Re-applies correct WIN/LOSS transactions
 *  4. Updates matchup scores/winnerId
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Load all COMPLETED contests for this game, with their completed matchups
    const contests = await prisma.contest.findMany({
      where: {
        iplGameId: gameId,
        status: 'COMPLETED',
      },
      include: {
        iplGame: {
          include: { tournament: true, team1: true, team2: true },
        },
        matchups: {
          where: { status: 'COMPLETED' },
          include: {
            user1: { include: { user: true } },
            user2: { include: { user: true } },
            draftPicks: {
              include: { player: { include: { stats: true } } },
            },
          },
        },
      },
    });

    if (contests.length === 0) {
      return NextResponse.json(
        { message: 'No completed contests found for this game' },
        { status: 404 }
      );
    }

    const results: Array<{
      matchupId: string;
      contestCoinValue: number;
      user1: string;
      user2: string;
      oldUser1Score: number;
      oldUser2Score: number;
      newUser1Score: number;
      newUser2Score: number;
      result: string;
      changed: boolean;
    }> = [];

    let totalReversed = 0;
    let totalAdminFee = 0;

    for (const contest of contests) {
      const { iplGame } = contest;
      const tournamentId = iplGame.tournamentId;

      for (const matchup of contest.matchups) {
        // ── 1. Reverse existing WIN/LOSS transactions ──────────────────────────
        const existingTxs = await prisma.coinTransaction.findMany({
          where: { matchupId: matchup.id, type: { in: ['WIN', 'LOSS'] } },
        });

        for (const tx of existingTxs) {
          const user = await prisma.user.findUnique({ where: { id: tx.userId } });
          if (!user) continue;

          await prisma.user.update({
            where: { id: tx.userId },
            data: { coins: user.coins - tx.amount },
          });

          const tb = await prisma.tournamentBalance.findUnique({
            where: { userId_tournamentId: { userId: tx.userId, tournamentId } },
          });
          if (tb) {
            await prisma.tournamentBalance.update({
              where: { userId_tournamentId: { userId: tx.userId, tournamentId } },
              data: { balance: tb.balance - tx.amount },
            });
          }

          if (tx.type === 'WIN') {
            const fresh = await prisma.user.findUnique({ where: { id: tx.userId } });
            if (fresh) {
              const newTotalWins = Math.max(0, fresh.totalWins - 1);
              const newTotalMatches = Math.max(0, fresh.totalMatches - 1);
              await prisma.user.update({
                where: { id: tx.userId },
                data: {
                  totalWins: newTotalWins,
                  totalMatches: newTotalMatches,
                  winPercentage: newTotalMatches > 0 ? (newTotalWins / newTotalMatches) * 100 : 0,
                },
              });
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
            }
          } else if (tx.type === 'LOSS') {
            const fresh = await prisma.user.findUnique({ where: { id: tx.userId } });
            if (fresh) {
              const newTotalMatches = Math.max(0, fresh.totalMatches - 1);
              await prisma.user.update({
                where: { id: tx.userId },
                data: {
                  totalMatches: newTotalMatches,
                  winPercentage: newTotalMatches > 0 ? (fresh.totalWins / newTotalMatches) * 100 : 0,
                },
              });
            }
          }
        }

        await prisma.coinTransaction.deleteMany({
          where: { matchupId: matchup.id, type: { in: ['WIN', 'LOSS'] } },
        });
        totalReversed += existingTxs.length;

        // ── 2. Recalculate scores ──────────────────────────────────────────────
        const user1Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user1.id);
        const user2Picks = matchup.draftPicks.filter(p => p.pickedByUserId === matchup.user2.id);

        const newUser1Score = calculateTotalPointsWithSwap(user1Picks, gameId);
        const newUser2Score = calculateTotalPointsWithSwap(user2Picks, gameId);

        const oldUser1Score = matchup.user1Score;
        const oldUser2Score = matchup.user2Score;
        const scoreChanged = oldUser1Score !== newUser1Score || oldUser2Score !== newUser2Score;

        // ── 3. Determine winner ────────────────────────────────────────────────
        let newWinnerId: string | null = null;
        let winnerSignupId: string | null = null;
        let loserSignupId: string | null = null;
        let winnerUserId: string | null = null;
        let loserUserId: string | null = null;

        if (newUser1Score > newUser2Score) {
          newWinnerId = matchup.user1.id;
          winnerSignupId = matchup.user1.id;
          loserSignupId = matchup.user2.id;
          winnerUserId = matchup.user1.user.id;
          loserUserId = matchup.user2.user.id;
        } else if (newUser2Score > newUser1Score) {
          newWinnerId = matchup.user2.id;
          winnerSignupId = matchup.user2.id;
          loserSignupId = matchup.user1.id;
          winnerUserId = matchup.user2.user.id;
          loserUserId = matchup.user1.user.id;
        }

        // ── 4. Update matchup ──────────────────────────────────────────────────
        await prisma.headToHeadMatchup.update({
          where: { id: matchup.id },
          data: { user1Score: newUser1Score, user2Score: newUser2Score, winnerId: newWinnerId },
        });

        // ── 5. Re-apply coin transactions ──────────────────────────────────────
        let adminFeeCollected = 0;

        if (winnerUserId && loserUserId && winnerSignupId && loserSignupId) {
          const winnerScore = Math.max(newUser1Score, newUser2Score);
          const loserScore = Math.min(newUser1Score, newUser2Score);
          const { coinValue } = contest;

          const winnerGrossWinnings = (winnerScore - loserScore) * coinValue;
          const adminFee = Math.floor(winnerGrossWinnings * 0.1);
          const winnerNetWinnings = winnerGrossWinnings - adminFee;
          const loserAmount = (loserScore - winnerScore) * coinValue;

          // Winner
          const winner = await prisma.user.findUnique({ where: { id: winnerUserId } });
          if (winner) {
            const newCoins = winner.coins + winnerNetWinnings;
            const newTotalWins = winner.totalWins + 1;
            const newTotalMatches = winner.totalMatches + 1;
            await prisma.user.update({
              where: { id: winnerUserId },
              data: {
                coins: newCoins,
                totalWins: newTotalWins,
                totalMatches: newTotalMatches,
                winPercentage: newTotalMatches > 0 ? (newTotalWins / newTotalMatches) * 100 : 0,
              },
            });
            const winnerTB = await prisma.tournamentBalance.findUnique({
              where: { userId_tournamentId: { userId: winnerUserId, tournamentId } },
            });
            const newWinnerTB = (winnerTB?.balance ?? 0) + winnerNetWinnings;
            await prisma.tournamentBalance.upsert({
              where: { userId_tournamentId: { userId: winnerUserId, tournamentId } },
              update: { balance: newWinnerTB },
              create: { userId: winnerUserId, tournamentId, balance: newWinnerTB },
            });
            await prisma.coinTransaction.create({
              data: {
                userId: winnerUserId,
                tournamentId,
                amount: winnerNetWinnings,
                balance: newWinnerTB,
                type: 'WIN',
                description: `Won contest [re-certified] (${iplGame.title})`,
                matchupId: matchup.id,
                contestId: contest.id,
                adminFee,
              },
            });
          }

          // Loser
          const loser = await prisma.user.findUnique({ where: { id: loserUserId } });
          if (loser) {
            const newCoins = loser.coins + loserAmount;
            const newTotalMatches = loser.totalMatches + 1;
            await prisma.user.update({
              where: { id: loserUserId },
              data: {
                coins: newCoins,
                totalMatches: newTotalMatches,
                winPercentage: newTotalMatches > 0 ? (loser.totalWins / newTotalMatches) * 100 : 0,
              },
            });
            const loserTB = await prisma.tournamentBalance.findUnique({
              where: { userId_tournamentId: { userId: loserUserId, tournamentId } },
            });
            const newLoserTB = (loserTB?.balance ?? 0) + loserAmount;
            await prisma.tournamentBalance.upsert({
              where: { userId_tournamentId: { userId: loserUserId, tournamentId } },
              update: { balance: newLoserTB },
              create: { userId: loserUserId, tournamentId, balance: newLoserTB },
            });
            await prisma.coinTransaction.create({
              data: {
                userId: loserUserId,
                tournamentId,
                amount: loserAmount,
                balance: newLoserTB,
                type: 'LOSS',
                description: `Lost contest [re-certified] (${iplGame.title})`,
                matchupId: matchup.id,
                contestId: contest.id,
                adminFee: 0,
              },
            });
          }

          if (adminFee > 0) {
            adminFeeCollected = adminFee;
            totalAdminFee += adminFee;
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
          newWinnerId === null ? 'Tie'
          : newWinnerId === matchup.user1.id
            ? `${matchup.user1.user.username} won`
            : `${matchup.user2.user.username} won`;

        results.push({
          matchupId: matchup.id,
          contestCoinValue: contest.coinValue,
          user1: matchup.user1.user.username,
          user2: matchup.user2.user.username,
          oldUser1Score,
          oldUser2Score,
          newUser1Score,
          newUser2Score,
          result: resultLabel,
          changed: scoreChanged,
        });
      }
    }

    const changedCount = results.filter(r => r.changed).length;

    return NextResponse.json({
      success: true,
      gameId,
      totalMatchups: results.length,
      changedMatchups: changedCount,
      totalTransactionsReversed: totalReversed,
      totalAdminFeeCollected: totalAdminFee,
      matchups: results,
    });
  } catch (error) {
    console.error('Error re-certifying game:', error);
    return NextResponse.json(
      { message: 'Failed to re-certify game', error: String(error) },
      { status: 500 }
    );
  }
}
