const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleTournament() {
  try {
    // Check if any tournaments exist
    const existingTournaments = await prisma.tournament.findMany()
    
    if (existingTournaments.length > 0) {
      console.log('Tournaments already exist:')
      existingTournaments.forEach(t => {
        console.log(`- ${t.name} (${t.status})`)
      })
      return
    }

    // Create IPL 2024 tournament
    const tournament = await prisma.tournament.create({
      data: {
        name: 'IPL 2024',
        description: 'Indian Premier League Season 2024',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-30'),
        status: 'ACTIVE',
        isActive: true
      }
    })

    console.log('Sample tournament created:')
    console.log(`- ${tournament.name} (ID: ${tournament.id})`)
    console.log(`- Status: ${tournament.status}`)
    console.log(`- Duration: ${tournament.startDate.toDateString()} to ${tournament.endDate.toDateString()}`)
    
  } catch (error) {
    console.error('Error creating tournament:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleTournament()