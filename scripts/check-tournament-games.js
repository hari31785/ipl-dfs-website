const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTournamentGames() {
  try {
    // Get all tournaments with their games count
    const tournaments = await prisma.tournament.findMany({
      include: {
        _count: {
          select: { games: true }
        }
      }
    })
    
    console.log('Tournaments and their games:')
    tournaments.forEach(tournament => {
      console.log(`- ${tournament.name}: ${tournament._count.games} games`)
    })
    
    // Check for IPL 2024 specifically
    const ipl2024 = tournaments.find(t => t.name === 'IPL 2024')
    if (ipl2024) {
      console.log(`\nIPL 2024 has ${ipl2024._count.games} games associated with it.`)
      if (ipl2024._count.games > 0) {
        console.log('This is why deletion is failing - tournaments with games cannot be deleted.')
        console.log('You need to delete all games first, or we can update the API to cascade delete.')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTournamentGames()