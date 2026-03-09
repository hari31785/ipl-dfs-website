const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupCoinSystem() {
  try {
    console.log('Starting coin system cleanup...\n')

    // 1. Delete all INITIAL transactions (old welcome bonus system)
    const deletedTransactions = await prisma.coinTransaction.deleteMany({
      where: { type: 'INITIAL' }
    })
    console.log(`✓ Deleted ${deletedTransactions.count} INITIAL transactions\n`)

    // 2. Recalculate each user's balance based on WIN/LOSS transactions
    const users = await prisma.user.findMany()
    
    for (const user of users) {
      // Get all WIN and LOSS transactions for this user
      const transactions = await prisma.coinTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' }
      })

      let calculatedBalance = 0
      
      // Recalculate balance from transactions
      for (const transaction of transactions) {
        calculatedBalance += transaction.amount
      }

      // Update user's coin balance
      await prisma.user.update({
        where: { id: user.id },
        data: { coins: calculatedBalance }
      })

      console.log(`✓ Updated ${user.username}:`)
      console.log(`  - Transactions: ${transactions.length}`)
      console.log(`  - Calculated balance: ${calculatedBalance}`)
      console.log(`  - Old balance: ${user.coins}\n`)
    }

    console.log('✓ Coin system cleanup complete!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupCoinSystem()
