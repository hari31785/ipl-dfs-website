const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreAndMigrate() {
  console.log('🔄 Restoring and migrating data to tournament-specific coin system...\n');
  
  // Find the latest backup file
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (backupFiles.length === 0) {
    console.error('❌ No backup files found!');
    process.exit(1);
  }
  
  const latestBackup = backupFiles[0];
  const backupPath = path.join(backupDir, latestBackup);
  
  console.log(`📂 Using backup: ${latestBackup}\n`);
  
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  try {
    // 1. Restore Admins first
    console.log('👤 Restoring admins...');
    for (const admin of backup.data.admins) {
      await prisma.admin.create({
        data: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          password: '$2a$10$defaultpassword', // Will need to reset
          createdAt: new Date(admin.createdAt),
          updatedAt: new Date(admin.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.admins.length} admins restored\n`);

    // 2. Restore Admin Coins
    console.log('💰 Restoring admin coins...');
    for (const adminCoin of backup.data.adminCoins) {
      await prisma.adminCoins.create({
        data: {
          id: adminCoin.id,
          totalCoins: adminCoin.totalCoins,
          updatedAt: new Date(adminCoin.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.adminCoins.length} admin coin records restored\n`);

    // 3. Restore Tournaments
    console.log('🏆 Restoring tournaments...');
    for (const tournament of backup.data.tournaments) {
      await prisma.tournament.create({
        data: {
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          startDate: new Date(tournament.startDate),
          endDate: new Date(tournament.endDate),
          isActive: tournament.isActive,
          status: tournament.status,
          createdAt: new Date(tournament.createdAt),
          updatedAt: new Date(tournament.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.tournaments.length} tournaments restored\n`);

    // 4. Restore IPL Teams
    console.log('🏏 Restoring IPL teams...');
    for (const team of backup.data.iplTeams) {
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
    console.log(`   ✓ ${backup.data.iplTeams.length} IPL teams restored\n`);

    // 5. Restore Players
    console.log('👥 Restoring players...');
    for (const player of backup.data.players) {
      await prisma.player.create({
        data: {
          id: player.id,
          name: player.name,
          role: player.role,
          price: player.price,
          jerseyNumber: player.jerseyNumber,
          isActive: player.isActive,
          iplTeamId: player.iplTeamId,
          tournamentId: player.tournamentId,
          createdAt: new Date(player.createdAt),
          updatedAt: new Date(player.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.players.length} players restored\n`);

    // 6. Restore IPL Games
    console.log('🎮 Restoring IPL games...');
    for (const game of backup.data.games) {
      await prisma.iPLGame.create({
        data: {
          id: game.id,
          title: game.title,
          gameDate: new Date(game.gameDate),
          signupDeadline: new Date(game.signupDeadline),
          status: game.status,
          team1Id: game.team1Id,
          team2Id: game.team2Id,
          tournamentId: game.tournamentId,
          createdAt: new Date(game.createdAt),
          updatedAt: new Date(game.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.games.length} IPL games restored\n`);

    // 7. Restore Users (without coin transactions for now)
    console.log('👨‍👩‍👧‍👦 Restoring users...');
    const userIdMap = new Map();
    for (const user of backup.data.users) {
      const restoredUser = await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          password: user.password,
          totalWins: user.totalWins,
          totalMatches: user.totalMatches,
          winPercentage: user.winPercentage,
          coins: user.coins, // Keep old global coins for reference
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
      userIdMap.set(user.id, restoredUser);
    }
    console.log(`   ✓ ${backup.data.users.length} users restored\n`);

    // 8. Create Tournament Balances for each user
    console.log('💳 Creating tournament-specific balances...');
    let balanceCount = 0;
    for (const user of backup.data.users) {
      for (const tournament of backup.data.tournaments) {
        // Give each user 1000 coins per tournament
        await prisma.tournamentBalance.create({
          data: {
            userId: user.id,
            tournamentId: tournament.id,
            balance: 1000 // Starting balance per tournament
          }
        });
        balanceCount++;
      }
    }
    console.log(`   ✓ ${balanceCount} tournament balances created\n`);

    // 9. Restore Contests
    console.log('🎯 Restoring contests...');
    for (const contest of backup.data.contests) {
      await prisma.contest.create({
        data: {
          id: contest.id,
          contestType: contest.contestType,
          coinValue: contest.coinValue,
          maxParticipants: contest.maxParticipants,
          totalSignups: contest.totalSignups,
          status: contest.status,
          iplGameId: contest.iplGameId,
          createdAt: new Date(contest.createdAt),
          updatedAt: new Date(contest.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.contests.length} contests restored\n`);

    // 10. Restore Contest Signups
    console.log('📝 Restoring contest signups...');
    let signupCount = 0;
    for (const contest of backup.data.contests) {
      for (const signup of contest.signups || []) {
        await prisma.contestSignup.create({
          data: {
            id: signup.id,
            userId: signup.userId,
            contestId: signup.contestId,
            signupAt: new Date(signup.signupAt)
          }
        });
        signupCount++;
      }
    }
    console.log(`   ✓ ${signupCount} contest signups restored\n`);

    // 11. Restore Matchups
    console.log('⚔️ Restoring matchups...');
    for (const matchup of backup.data.matchups) {
      await prisma.headToHeadMatchup.create({
        data: {
          id: matchup.id,
          contestId: matchup.contestId,
          user1Id: matchup.user1Id,
          user2Id: matchup.user2Id,
          status: matchup.status,
          firstPickUser: matchup.firstPickUser,
          user1Score: matchup.user1Score,
          user2Score: matchup.user2Score,
          winnerId: matchup.winnerId,
          createdAt: new Date(matchup.createdAt),
          updatedAt: new Date(matchup.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.matchups.length} matchups restored\n`);

    // 12. Restore Draft Picks
    console.log('🎯 Restoring draft picks...');
    let pickCount = 0;
    for (const matchup of backup.data.matchups) {
      for (const pick of matchup.draftPicks || []) {
        await prisma.draftPick.create({
          data: {
            id: pick.id,
            matchupId: pick.matchupId,
            playerId: pick.playerId,
            pickOrder: pick.pickOrder,
            pickedByUserId: pick.pickedByUserId,
            isBench: pick.isBench || false,
            pickTimestamp: new Date(pick.pickTimestamp)
          }
        });
        pickCount++;
      }
    }
    console.log(`   ✓ ${pickCount} draft picks restored\n`);

    // 13. Restore Player Stats
    console.log('📊 Restoring player stats...');
    for (const stat of backup.data.playerStats) {
      await prisma.playerStat.create({
        data: {
          id: stat.id,
          playerId: stat.playerId,
          iplGameId: stat.iplGameId,
          runs: stat.runs,
          wickets: stat.wickets,
          catches: stat.catches,
          runOuts: stat.runOuts,
          stumpings: stat.stumpings,
          didNotPlay: stat.didNotPlay,
          points: stat.points,
          createdAt: new Date(stat.createdAt),
          updatedAt: new Date(stat.updatedAt)
        }
      });
    }
    console.log(`   ✓ ${backup.data.playerStats.length} player stats restored\n`);

    // 14. Restore Coin Transactions with tournament linking
    console.log('💰 Restoring coin transactions (with tournament linking)...');
    for (const transaction of backup.data.coinTransactions) {
      // Find the tournament for this transaction via contest -> game -> tournament
      const contest = backup.data.contests.find(c => c.id === transaction.contestId);
      if (contest) {
        const game = backup.data.games.find(g => g.id === contest.iplGameId);
        if (game) {
          await prisma.coinTransaction.create({
            data: {
              id: transaction.id,
              userId: transaction.userId,
              tournamentId: game.tournamentId, // Link to tournament
              amount: transaction.amount,
              balance: transaction.balance,
              type: transaction.type,
              description: transaction.description,
              matchupId: transaction.matchupId,
              contestId: transaction.contestId,
              adminFee: transaction.adminFee,
              createdAt: new Date(transaction.createdAt)
            }
          });
        }
      }
    }
    console.log(`   ✓ ${backup.data.coinTransactions.length} coin transactions restored\n`);

    console.log('✅ Data restoration and migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${backup.data.users.length} users with ${balanceCount} tournament balances`);
    console.log(`   - ${backup.data.tournaments.length} tournaments`);
    console.log(`   - ${backup.data.contests.length} contests`);
    console.log(`   - ${backup.data.matchups.length} matchups with ${pickCount} picks`);
    console.log(`   - ${backup.data.coinTransactions.length} coin transactions (now tournament-specific)`);
    
  } catch (error) {
    console.error('❌ Error during restoration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
restoreAndMigrate()
  .then(() => {
    console.log('\n🎉 Database successfully migrated to tournament-specific coin system!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Restoration failed:', error);
    process.exit(1);
  });
