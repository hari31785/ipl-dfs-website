const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testContestWorkflow() {
  try {
    console.log('🧪 Testing Contest Management Workflow\n');
    
    // Step 1: Check existing data
    console.log('📊 Step 1: Checking existing data...');
    const tournaments = await prisma.tournament.findMany();
    const games = await prisma.iPLGame.findMany({ 
      include: { team1: true, team2: true } 
    });
    const contests = await prisma.contest.findMany({ 
      include: { 
        iplGame: { include: { team1: true, team2: true } },
        _count: { select: { signups: true, matchups: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const users = await prisma.user.findMany();
    
    console.log(`  ✓ Tournaments: ${tournaments.length}`);
    console.log(`  ✓ Games: ${games.length}`);
    console.log(`  ✓ Contests: ${contests.length}`);
    console.log(`  ✓ Users: ${users.length}\n`);
    
    // Step 2: Create test users if needed
    console.log('👥 Step 2: Creating test users...');
    const testUsers = [];
    const usernames = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank'];
    
    for (const username of usernames) {
      let user = await prisma.user.findUnique({ where: { username } });
      
      if (!user) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        user = await prisma.user.create({
          data: {
            username: username,
            name: username.charAt(0).toUpperCase() + username.slice(1),
            email: `${username}@test.com`,
            password: hashedPassword,
            coins: 1000
          }
        });
        console.log(`  ✓ Created user: ${user.username} (${user.coins} coins)`);
      } else {
        console.log(`  ✓ User exists: ${user.username} (${user.coins} coins)`);
      }
      testUsers.push(user);
    }
    console.log('');
    
    // Step 3: Find or create a contest
    console.log('🏆 Step 3: Finding/Creating contest...');
    let testContest = contests.find(c => c.status === 'SIGNUP_OPEN');
    
    if (!testContest && contests.length > 0) {
      testContest = contests[0];
      console.log(`  ✓ Using existing contest: ${testContest.iplGame.title} (${testContest.coinValue} coins)`);
      console.log(`  ℹ️  Status: ${testContest.status}`);
    } else if (testContest) {
      console.log(`  ✓ Found open contest: ${testContest.iplGame.title} (${testContest.coinValue} coins)`);
    } else {
      console.log('  ❌ No contests found. Please create a game first!');
      console.log('  💡 Run: node scripts/create-sample-game.js');
      await prisma.$disconnect();
      return;
    }
    console.log('');
    
    // Step 4: Sign up users to the contest
    console.log('📝 Step 4: Signing up users to contest...');
    const signupsNeeded = 4; // Even number for testing
    const signups = [];
    
    for (let i = 0; i < Math.min(signupsNeeded, testUsers.length); i++) {
      const user = testUsers[i];
      
      // Check if already signed up
      const existingSignup = await prisma.contestSignup.findUnique({
        where: {
          contestId_userId: {
            contestId: testContest.id,
            userId: user.id
          }
        }
      });
      
      if (!existingSignup) {
        const signup = await prisma.contestSignup.create({
          data: {
            contestId: testContest.id,
            userId: user.id
          }
        });
        console.log(`  ✓ Signed up: ${user.username}`);
        signups.push(signup);
      } else {
        console.log(`  ✓ Already signed up: ${user.username}`);
        signups.push(existingSignup);
      }
    }
    
    // Update contest signup count
    await prisma.contest.update({
      where: { id: testContest.id },
      data: { totalSignups: signups.length }
    });
    
    console.log('');
    
    // Step 5: Display current state
    const updatedContest = await prisma.contest.findUnique({
      where: { id: testContest.id },
      include: {
        iplGame: { include: { team1: true, team2: true } },
        signups: { include: { user: true } },
        matchups: { 
          include: { 
            user1: { include: { user: true } },
            user2: { include: { user: true } }
          } 
        }
      }
    });
    
    console.log('📋 Current Contest State:');
    console.log(`  Game: ${updatedContest.iplGame.title}`);
    console.log(`  Contest: ${updatedContest.coinValue} coins per point`);
    console.log(`  Status: ${updatedContest.status}`);
    console.log(`  Signups: ${updatedContest.signups.length}`);
    updatedContest.signups.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.user.username} (${s.user.name})`);
    });
    console.log(`  Matchups: ${updatedContest.matchups.length}`);
    if (updatedContest.matchups.length > 0) {
      updatedContest.matchups.forEach((m, i) => {
        console.log(`    ${i + 1}. ${m.user1.user.username} vs ${m.user2.user.username} (First pick: ${m.firstPickUser})`);
      });
    }
    console.log('');
    
    // Step 6: Instructions
    console.log('✅ Test Setup Complete!\n');
    console.log('🎯 Next Steps (in Admin Panel):');
    console.log('  1. Go to http://localhost:3000/admin/contests');
    console.log('  2. Find the contest with ID:', testContest.id.slice(-8));
    console.log('  3. Click "🔒 Close Signups" (if signups are open)');
    console.log('  4. Click "🎲 Generate Matchups" (after closing signups)');
    console.log('  5. Click "🎯 Open Drafting" (after matchups generated)');
    console.log('  6. Click "▶️ Start Contest" (when ready to go live)\n');
    
    console.log('📊 Contest Details:');
    console.log(`  Contest ID: ${testContest.id}`);
    console.log(`  Game: ${updatedContest.iplGame.title}`);
    console.log(`  Current Status: ${updatedContest.status}`);
    console.log(`  Participants: ${updatedContest.signups.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testContestWorkflow();
