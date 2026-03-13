const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createDataBackup() {
  try {
    console.log('📊 Creating JSON data backup...')
    
    const backup = {
      timestamp: new Date().toISOString(),
      data: {}
    }

    // Backup all major entities
    console.log('📦 Backing up users...')
    backup.data.users = await prisma.user.findMany()
    
    console.log('📦 Backing up teams...')
    backup.data.teams = await prisma.iPLTeam.findMany()
    
    console.log('📦 Backing up tournaments...')
    backup.data.tournaments = await prisma.tournament.findMany()
    
    console.log('📦 Backing up players...')
    backup.data.players = await prisma.player.findMany()
    
    console.log('📦 Backing up games...')
    backup.data.games = await prisma.iPLGame.findMany()
    
    console.log('📦 Backing up contests...')
    backup.data.contests = await prisma.contest.findMany()
    
    console.log('📦 Backing up signups...')
    backup.data.signups = await prisma.contestSignup.findMany()
    
    console.log('📦 Backing up matchups...')
    backup.data.matchups = await prisma.headToHeadMatchup.findMany()
    
    console.log('📦 Backing up draft picks...')
    backup.data.draftPicks = await prisma.draftPick.findMany()
    
    console.log('📦 Backing up player stats...')
    backup.data.playerStats = await prisma.playerStat.findMany()

    // Create backup directory and file
    const fs = require('fs')
    const backupDir = './backups'
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir)
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${backupDir}/data_backup_${timestamp}.json`
    
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2))
    
    // Calculate statistics
    const stats = {
      users: backup.data.users.length,
      teams: backup.data.teams.length,
      tournaments: backup.data.tournaments.length,
      players: backup.data.players.length,
      games: backup.data.games.length,
      contests: backup.data.contests.length,
      signups: backup.data.signups.length,
      matchups: backup.data.matchups.length,
      draftPicks: backup.data.draftPicks.length,
      playerStats: backup.data.playerStats.length
    }
    
    console.log('\n✅ JSON backup created successfully!')
    console.log(`📄 File: ${filename}`)
    console.log('📊 Backup contains:')
    Object.entries(stats).forEach(([key, count]) => {
      console.log(`   ${key}: ${count} records`)
    })
    
    return filename

  } catch (error) {
    console.error('❌ Error creating backup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  createDataBackup()
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { createDataBackup }