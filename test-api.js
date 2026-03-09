const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAPIs() {
  try {
    console.log('Testing Teams API...')
    const teams = await prisma.iPLTeam.findMany({
      orderBy: { name: 'asc' },
      include: {
        players: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })
    console.log('Teams count:', teams.length)
    console.log('First team:', JSON.stringify(teams[0], null, 2))

    console.log('\nTesting Players API...')
    const players = await prisma.player.findMany({
      orderBy: [
        { iplTeam: { shortName: 'asc' } },
        { name: 'asc' }
      ],
      include: {
        iplTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            color: true
          }
        }
      }
    })
    console.log('Players count:', players.length)
    console.log('First player:', JSON.stringify(players[0], null, 2))

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIs()
