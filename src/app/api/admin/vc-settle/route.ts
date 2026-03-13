import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tournamentBalanceId,
      type, // "ENCASH" or "REFILL"
      amount,
      adminUsername,
      notes 
    } = body;

    // Validate input
    if (!tournamentBalanceId || !type || !amount || !adminUsername) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== 'ENCASH' && type !== 'REFILL') {
      return NextResponse.json(
        { error: 'Invalid settlement type. Must be ENCASH or REFILL' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Get current balance
    const tournamentBalance = await prisma.tournamentBalance.findUnique({
      where: { id: tournamentBalanceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        },
        tournament: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!tournamentBalance) {
      return NextResponse.json(
        { error: 'Tournament balance not found' },
        { status: 404 }
      );
    }

    const balanceBefore = tournamentBalance.balance;
    const netBalance = balanceBefore; // Starting balance is 0, so current balance IS the net

    // Validate settlement based on type
    if (type === 'ENCASH') {
      // Can only encash if user is winning (positive balance)
      if (netBalance <= 0) {
        return NextResponse.json(
          { error: 'Cannot encash - user balance is not positive' },
          { status: 400 }
        );
      }
      
      // Cannot encash more than net winnings
      if (amount > netBalance) {
        return NextResponse.json(
          { error: `Cannot encash more than net winnings (${netBalance} VCs)` },
          { status: 400 }
        );
      }
    } else if (type === 'REFILL') {
      // Can only refill if user is losing (negative balance)
      if (netBalance >= 0) {
        return NextResponse.json(
          { error: 'Cannot refill - user balance is not negative' },
          { status: 400 }
        );
      }
    }

    // Calculate new balance
    const balanceAfter = type === 'ENCASH' 
      ? balanceBefore - amount  // Deduct winnings
      : balanceBefore + amount; // Add refill

    // Perform settlement in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update tournament balance
      const updatedBalance = await tx.tournamentBalance.update({
        where: { id: tournamentBalanceId },
        data: { balance: balanceAfter }
      });

      // Create settlement record
      const settlement = await tx.$executeRaw`
        INSERT INTO settlements (
          id,
          "tournamentBalanceId",
          "userId",
          "tournamentId",
          type,
          amount,
          "balanceBefore",
          "balanceAfter",
          "adminUsername",
          notes,
          "createdAt"
        ) VALUES (
          gen_random_uuid(),
          ${tournamentBalanceId},
          ${tournamentBalance.userId},
          ${tournamentBalance.tournamentId},
          ${type},
          ${amount},
          ${balanceBefore},
          ${balanceAfter},
          ${adminUsername},
          ${notes || null},
          NOW()
        )
      `;

      return { updatedBalance, settlement };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ${type === 'ENCASH' ? 'encashed' : 'refilled'} ${amount} VCs for ${tournamentBalance.user.name}`,
      data: {
        user: tournamentBalance.user,
        tournament: tournamentBalance.tournament,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        netBalanceBefore: netBalance,
        netBalanceAfter: balanceAfter, // No offset, balance IS the net
      }
    });

  } catch (error) {
    console.error('Error processing VC settlement:', error);
    return NextResponse.json(
      { error: 'Failed to process settlement' },
      { status: 500 }
    );
  }
}
