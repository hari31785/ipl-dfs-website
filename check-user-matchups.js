const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserMatchups() {
  try {
    // Find the users
    const user1 = await prisma.user.findFirst({
      where: { username: 'praneeth24' }
    });
    
    const user2 = await prisma.user.findFirst({
      where: { username: 'RakiV' }
    });
    
    if (!user1 || !user2) {
      console.log('❌ Users not found');
      console.log('praneeth24:', user1?.id || 'NOT FOUND');
      console.log('RakiV:', user2?.id || 'NOT FOUND');
      return;
    }
    
    console.log('✅ Found users:');
    console.log('praneeth24:', user1.id);
    console.log('RakiV:', user2.id);
    console.log('');
    
    // Get all their signups
    const signupsUser1 = await prisma.contestSignup.findMany({
      where: { userId: user1.id },
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true
              }
            }
          }
        },
        matchupsAsUser1: {
          include: {
            user2: {
              include: {
                user: true
              }
            }
          }
        },
        matchupsAsUser2: {
          include: {
            user1: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });
    
    // Filter to matchups against RakiV
    const matchupsAgainstRakiv = [];
    for (const signup of signupsUser1) {
      for (const matchup of signup.matchupsAsUser1) {
        if (matchup.user2.userId === user2.id) {
          matchupsAgainstRakiv.push({
            matchupId: matchup.id,
            game: `${signup.contest.iplGame.team1.shortName} vs ${signup.contest.iplGame.team2.shortName}`,
            gameDate: signup.contest.iplGame.gameDate,
            createdAt: matchup.createdAt,
            contestId: signup.contestId
          });
        }
      }
      for (const matchup of signup.matchupsAsUser2) {
        if (matchup.user1.userId === user2.id) {
          matchupsAgainstRakiv.push({
            matchupId: matchup.id,
            game: `${signup.contest.iplGame.team1.shortName} vs ${signup.contest.iplGame.team2.shortName}`,
            gameDate: signup.contest.iplGame.gameDate,
            createdAt: matchup.createdAt,
            contestId: signup.contestId
          });
        }
      }
    }
    
    // Sort by creation date
    matchupsAgainstRakiv.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    console.log(`📊 Found ${matchupsAgainstRakiv.length} matchups between praneeth24 and RakiV:\n`);
    
    matchupsAgainstRakiv.forEach((m, idx) => {
      const gameDate = new Date(m.gameDate);
      const createdAt = new Date(m.createdAt);
      console.log(`${idx + 1}. ${m.game}`);
      console.log(`   Game Date: ${gameDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      console.log(`   Created: ${createdAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      console.log(`   Contest ID: ${m.contestId}`);
      console.log(`   Matchup ID: ${m.matchupId}`);
      
      // Calculate days between
      if (idx > 0) {
        const prevCreated = new Date(matchupsAgainstRakiv[idx - 1].createdAt);
        const daysDiff = (createdAt - prevCreated) / (1000 * 60 * 60 * 24);
        console.log(`   ⏱️  ${daysDiff.toFixed(1)} days since previous matchup`);
      }
      console.log('');
    });
    
    // Check the "same day" logic
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    console.log(`\n🕐 Today's date start (for same-day logic): ${todayStart.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserMatchups();
