import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    // Get all tournament balances with user and tournament details
    const balances = await prisma.tournamentBalance.findMany({
      where: tournamentId ? { tournamentId } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phone: true,
          }
        },
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        }
      },
      orderBy: [
        { tournamentId: 'asc' },
        { balance: 'desc' } // Winners first, then losers
      ]
    });

    // Get settlements separately for now (until migration is run)
    const settlementsByBalance = await prisma.$queryRaw<any[]>`
      SELECT * FROM settlements 
      WHERE "tournamentBalanceId" IN (${balances.map(b => b.id).join(',') || 'NULL'})
      ORDER BY "createdAt" DESC
    `.catch(() => []) as any[];

    // Map settlements to balances
    const settlementsMap = settlementsByBalance.reduce((acc: any, settlement: any) => {
      if (!acc[settlement.tournamentBalanceId]) {
        acc[settlement.tournamentBalanceId] = [];
      }
      acc[settlement.tournamentBalanceId].push(settlement);
      return acc;
    }, {});

    // Group by tournament and categorize
    const tournamentGroups = balances.reduce((acc: any, balance: any) => {
      const tId = balance.tournamentId;
      if (!acc[tId]) {
        acc[tId] = {
          tournament: balance.tournament,
          winners: [],
          losers: [],
          breakEven: [],
          totalWinnings: 0,
          totalLosses: 0,
          netBalance: 0,
        };
      }

      const settlements = settlementsMap[balance.id] || [];
      const netBalance = balance.balance; // Starting balance is 0, so current balance IS the net
      const userBalance = {
        ...balance,
        netBalance,
        settlements: settlements.slice(0, 5), // Last 5 settlements
        lastSettlement: settlements[0] || null,
        totalSettled: settlements.reduce((sum: number, s: any) => {
          return sum + (s.type === 'ENCASH' ? s.amount : -s.amount);
        }, 0)
      };

      if (netBalance > 0) {
        acc[tId].winners.push(userBalance);
        acc[tId].totalWinnings += netBalance;
      } else if (netBalance < 0) {
        acc[tId].losers.push(userBalance);
        acc[tId].totalLosses += Math.abs(netBalance);
      } else {
        acc[tId].breakEven.push(userBalance);
      }

      acc[tId].netBalance = acc[tId].totalWinnings - acc[tId].totalLosses;

      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: tournamentGroups,
      summary: {
        totalUsers: balances.length,
        totalTournaments: Object.keys(tournamentGroups).length,
      }
    });

  } catch (error) {
    console.error('Error fetching VC balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VC balances' },
      { status: 500 }
    );
  }
}
