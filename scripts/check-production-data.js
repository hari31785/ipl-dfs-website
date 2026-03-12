const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProductionData() {
  try {
    console.log('🔍 Checking Production Database...\n');

    // Check Admins
    const admins = await prisma.admin.findMany();
    console.log('👥 ADMINS:');
    if (admins.length === 0) {
      console.log('   ❌ NO ADMINS FOUND!\n');
    } else {
      admins.forEach(admin => {
        console.log(`   ✓ ${admin.name} (@${admin.username}) - ID: ${admin.id}`);
      });
      console.log('');
    }

    // Check Users
    const users = await prisma.user.findMany();
    console.log(`👤 USERS: ${users.length}`);
    if (users.length > 0) {
      users.slice(0, 5).forEach(user => {
        console.log(`   - ${user.name} (@${user.username})`);
      });
      if (users.length > 5) console.log(`   ... and ${users.length - 5} more`);
    }
    console.log('');

    // Check Tournaments
    const tournaments = await prisma.tournament.findMany();
    console.log(`🏆 TOURNAMENTS: ${tournaments.length}`);
    tournaments.forEach(t => {
      console.log(`   - ${t.name} (${t.status})`);
    });
    console.log('');

    // Check Teams
    const teams = await prisma.iPLTeam.findMany();
    console.log(`🏏 IPL TEAMS: ${teams.length}`);
    if (teams.length > 0) {
      teams.slice(0, 5).forEach(team => {
        console.log(`   - ${team.name} (${team.shortName})`);
      });
      if (teams.length > 5) console.log(`   ... and ${teams.length - 5} more`);
    }
    console.log('');

    // Check Players
    const players = await prisma.player.findMany();
    console.log(`👨‍⚽ PLAYERS: ${players.length}\n`);

    // Check Games
    const games = await prisma.iPLGame.findMany();
    console.log(`🎮 GAMES: ${games.length}\n`);

    // Check Contests
    const contests = await prisma.contest.findMany();
    console.log(`🎯 CONTESTS: ${contests.length}\n`);

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   Admins: ${admins.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Tournaments: ${tournaments.length}`);
    console.log(`   Teams: ${teams.length}`);
    console.log(`   Players: ${players.length}`);
    console.log(`   Games: ${games.length}`);
    console.log(`   Contests: ${contests.length}`);
    console.log('');

    if (admins.length === 0) {
      console.log('⚠️  WARNING: No admin users found!');
      console.log('💡 To restore admin, run:');
      console.log('   node scripts/create-admin-user.js');
      console.log('   OR');
      console.log('   node scripts/restore-and-migrate-data.js');
    }

    if (users.length === 0 && tournaments.length === 0) {
      console.log('⚠️  WARNING: Database appears empty!');
      console.log('💡 To restore from backup, run:');
      console.log('   node scripts/restore-and-migrate-data.js');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionData();
