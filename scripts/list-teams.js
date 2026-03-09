const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listAllTeams() {
  try {
    const teams = await prisma.iPLTeam.findMany({
      orderBy: { shortName: 'asc' }
    })

    console.log('📋 Current IPL Teams in Database:')
    console.log('================================')
    
    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name} - ${team.shortName} - ${team.city} - ${team.color}`)
    })
    
    console.log(`\nTotal: ${teams.length}/10 teams`)

  } catch (error) {
    console.error('Error fetching teams:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAllTeams()