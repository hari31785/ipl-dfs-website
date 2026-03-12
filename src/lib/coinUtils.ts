import { prisma } from "@/lib/prisma"

interface RecordMatchResultParams {
  winnerId: string
  loserId: string
  contestId: string
  matchupId: string
  pointDifference: number
  contestCoinValue: number // 25, 50, or 100
  tournamentId: string // Add tournament ID
}

export async function recordMatchResult({
  winnerId,
  loserId,
  contestId,
  matchupId,
  pointDifference,
  contestCoinValue,
  tournamentId,
}: RecordMatchResultParams) {
  // Calculate gross winnings (before admin fee)
  const grossWinnings = contestCoinValue * pointDifference
  
  // Calculate 10% admin fee
  const adminFee = Math.floor(grossWinnings * 0.1)
  
  // Net winnings for the winner (90% of gross)
  const netWinnings = grossWinnings - adminFee
  
  // Loser loses the gross amount
  const lossAmount = -grossWinnings

  // Get current user balances
  const winner = await prisma.user.findUnique({ where: { id: winnerId } })
  const loser = await prisma.user.findUnique({ where: { id: loserId } })

  if (!winner || !loser) {
    throw new Error("User not found")
  }

  // Update winner's coins and create transaction
  const newWinnerBalance = winner.coins + netWinnings
  await prisma.user.update({
    where: { id: winnerId },
    data: { 
      coins: newWinnerBalance,
      totalWins: { increment: 1 },
      totalMatches: { increment: 1 },
    },
  })

  await prisma.coinTransaction.create({
    data: {
      userId: winnerId,
      tournamentId,
      amount: netWinnings,
      balance: newWinnerBalance,
      type: "WIN",
      description: `Won contest - earned ${netWinnings} coins (${adminFee} admin fee)`,
      matchupId,
      contestId,
      adminFee,
    },
  })

  // Update loser's coins and create transaction
  const newLoserBalance = loser.coins + lossAmount
  await prisma.user.update({
    where: { id: loserId },
    data: { 
      coins: newLoserBalance,
      totalMatches: { increment: 1 },
    },
  })

  await prisma.coinTransaction.create({
    data: {
      userId: loserId,
      tournamentId,
      amount: lossAmount,
      balance: newLoserBalance,
      type: "LOSS",
      description: `Lost contest - lost ${Math.abs(lossAmount)} coins`,
      matchupId,
      contestId,
      adminFee: 0,
    },
  })

  // Update admin coins
  let adminCoins = await prisma.adminCoins.findFirst()
  
  if (!adminCoins) {
    adminCoins = await prisma.adminCoins.create({
      data: { totalCoins: adminFee },
    })
  } else {
    await prisma.adminCoins.update({
      where: { id: adminCoins.id },
      data: { totalCoins: { increment: adminFee } },
    })
  }

  return {
    winnerId,
    netWinnings,
    loserId,
    lossAmount: Math.abs(lossAmount),
    adminFee,
  }
}
