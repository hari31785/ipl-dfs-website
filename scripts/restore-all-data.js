/**
 * Restore All Data from Backup
 * 
 * This script restores all data from a backup file, including:
 * - Users (with admin details recreated)
 * - Tournaments
 * - Teams
 * - Players
 * - Games
 * - Contests
 * - Signups
 * - Matchups
 * - Draft Picks
 * - Player Stats
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function restoreAllData(backupFilePath) {
  console.log('🔄 Restoring all data from backup...\n');

  // Read backup file
  const backupPath = backupFilePath || (() => {
    const backupDir = path.join(__dirname, '..', 'backups');
    const backupFiles = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('data_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backupFiles.length === 0) {
      console.error('❌ No backup files found!');
      process.exit(1);
    }
    
    return path.join(backupDir, backupFiles[0]);
  })();

  console.log(`📂 Using backup: ${path.basename(backupPath)}\n`);

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const data = backup.data || backup;

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log('🗑️  Clearing existing data...');
    await prisma.playerStat.deleteMany({});
    await prisma.draftPick.deleteMany({});
    await prisma.headToHeadMatchup.deleteMany({});
    await prisma.contestSignup.deleteMany({});
    await prisma.contestEntry.deleteMany({});
    await prisma.contest.deleteMany({});
    await prisma.iPLGame.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.coinTransaction.deleteMany({});
    await prisma.settlement.deleteMany({});
    await prisma.tournamentBalance.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.admin.deleteMany({});
    await prisma.adminCoins.deleteMany({});
    await prisma.iPLTeam.deleteMany({});
    await prisma.tournament.deleteMany({});
    console.log('   ✓ Existing data cleared\n');

    // Restore Admins (recreate default admin)
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.admin.create({
      data: {
        username: 'admin',
        password: adminPassword,
        name: 'Admin'
      }
    });
    console.log('   ✓ Admin user created (username: admin, password: admin123)\n');

    // Restore AdminCoins
    console.log('💰 Initializing admin coins...');
    await prisma.adminCoins.create({
      data: {
        totalCoins: 0
      }
    });
    console.log('   ✓ Admin coins initialized\n');

    // Restore Tournaments
    if (data.tournaments && data.tournaments.length > 0) {
      console.log('🏆 Restoring tournaments...');
      for (const tournament of data.tournaments) {
        await prisma.tournament.create({
          data: {
            id: tournament.id,
            name: tournament.name,
            description: tournament.description,
            startDate: new Date(tournament.startDate),
            endDate: new Date(tournament.endDate),
            isActive: tournament.isActive,
            status: tournament.status,
            externalSeriesId: tournament.externalSeriesId || null,
            createdAt: new Date(tournament.createdAt),
            updatedAt: new Date(tournament.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.tournaments.length} tournaments restored\n`);
    }

    // Restore IPL Teams
    if (data.teams && data.teams.length > 0) {
      console.log('🏏 Restoring IPL teams...');
      for (const team of data.teams) {
        await prisma.iPLTeam.create({
          data: {
            id: team.id,
            name: team.name,
            shortName: team.shortName,
            city: team.city,
            color: team.color,
            logoUrl: team.logoUrl,
            isActive: team.isActive,
            createdAt: new Date(team.createdAt),
            updatedAt: new Date(team.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.teams.length} IPL teams restored\n`);
    }

    // Restore Players
    if (data.players && data.players.length > 0) {
      console.log('👥 Restoring players...');
      for (const player of data.players) {
        await prisma.player.create({
          data: {
            id: player.id,
            name: player.name,
            role: player.role,
            iplTeamId: player.iplTeamId,
            tournamentId: player.tournamentId,
            isActive: player.isActive,
            jerseyNumber: player.jerseyNumber,
            createdAt: new Date(player.createdAt),
            updatedAt: new Date(player.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.players.length} players restored\n`);
    }

    // Restore Users
    if (data.users && data.users.length > 0) {
      console.log('👤 Restoring users...');
      for (const user of data.users) {
        await prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            phone: user.phone,
            password: user.password,
            totalWins: user.totalWins || 0,
            totalMatches: user.totalMatches || 0,
            winPercentage: user.winPercentage || 0,
            coins: user.coins || 0,
            securityQuestion1: user.securityQuestion1,
            securityAnswer1: user.securityAnswer1,
            securityQuestion2: user.securityQuestion2,
            securityAnswer2: user.securityAnswer2,
            securityQuestion3: user.securityQuestion3,
            securityAnswer3: user.securityAnswer3,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.users.length} users restored\n`);
    }

    // Restore Games
    if (data.games && data.games.length > 0) {
      console.log('🎮 Restoring games...');
      for (const game of data.games) {
        await prisma.iPLGame.create({
          data: {
            id: game.id,
            tournamentId: game.tournamentId,
            title: game.title,
            description: game.description,
            team1Id: game.team1Id,
            team2Id: game.team2Id,
            gameDate: new Date(game.gameDate),
            signupDeadline: new Date(game.signupDeadline),
            status: game.status,
            createdAt: new Date(game.createdAt),
            updatedAt: new Date(game.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.games.length} games restored\n`);
    }

    // Restore Contests
    if (data.contests && data.contests.length > 0) {
      console.log('🏆 Restoring contests...');
      for (const contest of data.contests) {
        await prisma.contest.create({
          data: {
            id: contest.id,
            iplGameId: contest.iplGameId,
            contestType: contest.contestType,
            coinValue: contest.coinValue,
            maxParticipants: contest.maxParticipants,
            totalSignups: contest.totalSignups || 0,
            status: contest.status,
            createdAt: new Date(contest.createdAt),
            updatedAt: new Date(contest.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.contests.length} contests restored\n`);
    }

    // Restore Contest Signups
    if (data.signups && data.signups.length > 0) {
      console.log('✍️  Restoring contest signups...');
      for (const signup of data.signups) {
        await prisma.contestSignup.create({
          data: {
            id: signup.id,
            contestId: signup.contestId,
            userId: signup.userId,
            createdAt: new Date(signup.createdAt)
          }
        });
      }
      console.log(`   ✓ ${data.signups.length} signups restored\n`);
    }

    // Restore Matchups
    if (data.matchups && data.matchups.length > 0) {
      console.log('⚔️  Restoring matchups...');
      for (const matchup of data.matchups) {
        await prisma.headToHeadMatchup.create({
          data: {
            id: matchup.id,
            contestId: matchup.contestId,
            user1Id: matchup.user1Id,
            user2Id: matchup.user2Id,
            winnerId: matchup.winnerId,
            user1Score: matchup.user1Score || 0,
            user2Score: matchup.user2Score || 0,
            status: matchup.status,
            tossCoin: matchup.tossCoin,
            tossWinnerId: matchup.tossWinnerId,
            draftOrder: matchup.draftOrder,
            createdAt: new Date(matchup.createdAt),
            updatedAt: new Date(matchup.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.matchups.length} matchups restored\n`);
    }

    // Restore Draft Picks
    if (data.draftPicks && data.draftPicks.length > 0) {
      console.log('🎯 Restoring draft picks...');
      for (const pick of data.draftPicks) {
        await prisma.draftPick.create({
          data: {
            id: pick.id,
            matchupId: pick.matchupId,
            userId: pick.userId,
            playerId: pick.playerId,
            pickNumber: pick.pickNumber,
            createdAt: new Date(pick.createdAt)
          }
        });
      }
      console.log(`   ✓ ${data.draftPicks.length} draft picks restored\n`);
    }

    // Restore Player Stats
    if (data.playerStats && data.playerStats.length > 0) {
      console.log('📊 Restoring player stats...');
      for (const stat of data.playerStats) {
        await prisma.playerStat.create({
          data: {
            id: stat.id,
            playerId: stat.playerId,
            iplGameId: stat.iplGameId,
            runs: stat.runs || 0,
            wickets: stat.wickets || 0,
            catches: stat.catches || 0,
            runOuts: stat.runOuts || 0,
            stumpings: stat.stumpings || 0,
            didNotPlay: stat.didNotPlay || false,
            points: stat.points || 0,
            createdAt: new Date(stat.createdAt),
            updatedAt: new Date(stat.updatedAt)
          }
        });
      }
      console.log(`   ✓ ${data.playerStats.length} player stats restored\n`);
    }

    console.log('\n✅ All data restored successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Admin: 1 user (username: admin, password: admin123)`);
    console.log(`   Users: ${data.users?.length || 0} records`);
    console.log(`   Tournaments: ${data.tournaments?.length || 0} records`);
    console.log(`   Teams: ${data.teams?.length || 0} records`);
    console.log(`   Players: ${data.players?.length || 0} records`);
    console.log(`   Games: ${data.games?.length || 0} records`);
    console.log(`   Contests: ${data.contests?.length || 0} records`);
    console.log(`   Signups: ${data.signups?.length || 0} records`);
    console.log(`   Matchups: ${data.matchups?.length || 0} records`);
    console.log(`   Draft Picks: ${data.draftPicks?.length || 0} records`);
    console.log(`   Player Stats: ${data.playerStats?.length || 0} records`);

  } catch (error) {
    console.error('\n❌ Error during restore:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup file from command line argument or use latest
const backupFile = process.argv[2];
restoreAllData(backupFile);
