import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToUser } from '@/lib/pushNotifications';


// PUT /api/admin/contests/[id] - Update contest status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['SIGNUP_OPEN', 'SIGNUP_CLOSED', 'DRAFT_PHASE', 'LIVE', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    const contest = await prisma.contest.update({
      where: { id },
      data: { status },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        },
        signups: {
          select: { id: true, userId: true }
        }
      }
    });

    // Push notification when contest goes LIVE
    if (status === 'LIVE' || status === 'ACTIVE') {
      const gameTitle = `${contest.iplGame.team1.shortName} vs ${contest.iplGame.team2.shortName}`;
      const contestTypeLabel =
        contest.contestType === 'HIGH_ROLLER' ? 'High Roller (100 coins)' :
        contest.contestType === 'REGULAR'     ? 'Regular (50 coins)' :
        contest.contestType === 'LOW_STAKES'  ? 'Low Stakes (25 coins)' :
        `${contest.coinValue} coins`;

      // Build signupId → opponent username map from matchups.
      // Keyed by ContestSignup ID (not userId) so users with multiple entries
      // in the same contest each get the correct opponent.
      const matchupsForNotif = await prisma.headToHeadMatchup.findMany({
        where: { contestId: id },
        include: {
          user1: { include: { user: { select: { id: true, username: true } } } },
          user2: { include: { user: { select: { id: true, username: true } } } },
        },
      });
      const opponentMap = new Map<string, string>();
      for (const m of matchupsForNotif) {
        opponentMap.set(m.user1Id, m.user2.user.username);
        opponentMap.set(m.user2Id, m.user1.user.username);
      }

      await Promise.all(
        contest.signups.map((s) => {
          const opponentUsername = opponentMap.get(s.id);
          const body = opponentUsername
            ? `${gameTitle} is underway — you're up against @${opponentUsername}. Check your active contest!`
            : `${gameTitle} is underway. Check your active contest!`;
          return sendToUser(s.userId, {
            title: `🏏 Contest Live · ${contestTypeLabel}`,
            body,
            icon: '/icon-192.png',
            url: '/dashboard?tab=my-contests&sub=active',
          });
        })
      );
    }

    // Push notification when contest moves to DRAFT_PHASE (draft room opens)
    if (status === 'DRAFT_PHASE') {
      const gameTitle = `${contest.iplGame.team1.shortName} vs ${contest.iplGame.team2.shortName}`;
      const contestTypeLabel =
        contest.contestType === 'HIGH_ROLLER' ? 'High Roller (100 coins)' :
        contest.contestType === 'REGULAR'     ? 'Regular (50 coins)' :
        contest.contestType === 'LOW_STAKES'  ? 'Low Stakes (25 coins)' :
        `${contest.coinValue} coins`;

      // Build signupId → opponent username map from matchups.
      // Keyed by ContestSignup ID so multiple entries per user get correct opponents.
      const matchupsForDraft = await prisma.headToHeadMatchup.findMany({
        where: { contestId: id },
        include: {
          user1: { include: { user: { select: { id: true, username: true } } } },
          user2: { include: { user: { select: { id: true, username: true } } } },
        },
      });
      const draftOpponentMap = new Map<string, string>();
      for (const m of matchupsForDraft) {
        draftOpponentMap.set(m.user1Id, m.user2.user.username);
        draftOpponentMap.set(m.user2Id, m.user1.user.username);
      }

      await Promise.all(
        contest.signups.map((s) => {
          const opponentUsername = draftOpponentMap.get(s.id);
          const body = opponentUsername
            ? `You're up against @${opponentUsername} in ${gameTitle} — head to your dashboard to draft your team!`
            : `${gameTitle} draft is now open — head to your dashboard and draft your team!`;
          return sendToUser(s.userId, {
            title: `⚡ Draft Open · ${contestTypeLabel}`,
            body,
            icon: '/icon-192.png',
            url: '/dashboard?tab=my-contests&sub=upcoming',
          });
        })
      );
    }

    return NextResponse.json(contest);
  } catch (error) {
    console.error('Error updating contest:', error);
    return NextResponse.json(
      { message: 'Failed to update contest' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/contests/[id] - Delete contest and reverse all transactions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get contest with all related data
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        signups: true,
        matchups: {
          include: {
            draftPicks: true,
            user1: {
              include: {
                user: true
              }
            },
            user2: {
              include: {
                user: true
              }
            }
          }
        },
        iplGame: true,
        coinTransactions: {
          include: {
            user: true
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

    // Use transaction to ensure all deletions happen atomically
    await prisma.$transaction(async (tx) => {
      let totalAdminFeeReversed = 0;
      const affectedUsers = new Map<string, { userId: string; wins: number; losses: number }>();

      // Step 1: Reverse coin transactions and collect affected users
      for (const transaction of contest.coinTransactions) {
        const userId = transaction.userId;
        
        // Track affected users
        if (!affectedUsers.has(userId)) {
          affectedUsers.set(userId, { userId, wins: 0, losses: 0 });
        }
        const userData = affectedUsers.get(userId)!;
        
        if (transaction.type === 'WIN') {
          userData.wins += 1;
        } else if (transaction.type === 'LOSS') {
          userData.losses += 1;
        }

        // Reverse the coin balance
        await tx.user.update({
          where: { id: userId },
          data: {
            coins: {
              decrement: transaction.amount // This will subtract wins and add back losses
            }
          }
        });

        // Reverse tournament balance
        const tournamentBalance = await tx.tournamentBalance.findUnique({
          where: {
            userId_tournamentId: {
              userId: userId,
              tournamentId: transaction.tournamentId
            }
          }
        });

        if (tournamentBalance) {
          await tx.tournamentBalance.update({
            where: {
              userId_tournamentId: {
                userId: userId,
                tournamentId: transaction.tournamentId
              }
            },
            data: {
              balance: {
                decrement: transaction.amount
              }
            }
          });
        }

        // Track admin fees to reverse
        totalAdminFeeReversed += transaction.adminFee;
      }

      // Step 2: Delete all coin transactions for this contest
      await tx.coinTransaction.deleteMany({
        where: { contestId: id }
      });

      // Step 3: Update user stats (reverse wins/losses and recalculate percentages)
      for (const [userId, data] of affectedUsers) {
        const user = await tx.user.findUnique({
          where: { id: userId }
        });

        if (user) {
          const newTotalWins = Math.max(0, user.totalWins - data.wins);
          const newTotalMatches = Math.max(0, user.totalMatches - (data.wins + data.losses));
          const newWinPercentage = newTotalMatches > 0 ? (newTotalWins / newTotalMatches) * 100 : 0;

          await tx.user.update({
            where: { id: userId },
            data: {
              totalWins: newTotalWins,
              totalMatches: newTotalMatches,
              winPercentage: newWinPercentage
            }
          });
        }
      }

      // Step 4: Reverse admin fees
      if (totalAdminFeeReversed > 0) {
        const adminCoins = await tx.adminCoins.findFirst();
        if (adminCoins) {
          await tx.adminCoins.update({
            where: { id: adminCoins.id },
            data: {
              totalCoins: Math.max(0, adminCoins.totalCoins - totalAdminFeeReversed)
            }
          });
        }
      }

      // Step 5: Delete all draft picks
      await tx.draftPick.deleteMany({
        where: {
          matchupId: {
            in: contest.matchups.map(m => m.id)
          }
        }
      });

      // Step 6: Delete all matchups
      await tx.headToHeadMatchup.deleteMany({
        where: { contestId: id }
      });

      // Step 7: Delete all signups
      await tx.contestSignup.deleteMany({
        where: { contestId: id }
      });

      // Step 8: Finally, delete the contest
      await tx.contest.delete({
        where: { id }
      });
    });

    return NextResponse.json({ 
      message: 'Contest deleted successfully. All transactions, stats, and related data have been reversed.',
      affectedUsers: contest.coinTransactions.length,
      transactionsReversed: contest.coinTransactions.length,
      matchupsDeleted: contest.matchups.length,
      signupsDeleted: contest.signups.length
    });
  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json(
      { message: 'Failed to delete contest', error: String(error) },
      { status: 500 }
    );
  }
}