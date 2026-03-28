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
          select: { userId: true }
        }
      }
    });

    // Push notification when contest goes LIVE
    if (status === 'LIVE' || status === 'ACTIVE') {
      const gameTitle = `${contest.iplGame.team1.shortName} vs ${contest.iplGame.team2.shortName}`;
      await Promise.all(
        contest.signups.map((s) =>
          sendToUser(s.userId, {
            title: '🏏 Contest is LIVE!',
            body: `${gameTitle} has started — check your active contest!`,
            icon: '/icon-192.png',
            url: '/dashboard?tab=my-contests&sub=active',
          })
        )
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