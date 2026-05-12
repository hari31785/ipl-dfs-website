const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRoundRobin() {
  console.log('\n🔍 Testing Round-Robin Matchmaking Logic\n');
  
  // Get recent tournament
  const tournament = await prisma.tournament.findFirst({
    where: { name: 'IPL 2026' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!tournament) {
    console.log('❌ No tournament found');
    return;
  }
  
  console.log(`✅ Tournament: ${tournament.name} (${tournament.id})\n`);
  
  // Get all matchups in this tournament
  const matchups = await prisma.headToHeadMatchup.findMany({
    where: {
      contest: {
        iplGame: { tournamentId: tournament.id }
      }
    },
    include: {
      user1: { select: { user: { select: { username: true, id: true } } } },
      user2: { select: { user: { select: { username: true, id: true } } } },
      contest: { 
        select: { 
          iplGame: { 
            select: { 
              title: true,
              gameDate: true,
              team1: { select: { name: true } },
              team2: { select: { name: true } }
            } 
          } 
        } 
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`📊 Total matchups: ${matchups.length}\n`);
  
  // Analyze for specific user
  const testUsername = 'praneeth24';
  const testUser = await prisma.user.findUnique({
    where: { username: testUsername }
  });
  
  if (!testUser) {
    console.log(`❌ User ${testUsername} not found`);
    return;
  }
  
  console.log(`👤 Analyzing matchups for: ${testUsername}\n`);
  
  // Get all opponents for this user
  const userMatchups = matchups.filter(m => 
    m.user1.user.id === testUser.id || m.user2.user.id === testUser.id
  );
  
  console.log(`📈 ${testUsername} has played ${userMatchups.length} matchups:\n`);
  
  const opponentCount = new Map();
  const opponentHistory = [];
  
  userMatchups.forEach((m, idx) => {
    const isUser1 = m.user1.user.id === testUser.id;
    const opponent = isUser1 ? m.user2.user : m.user1.user;
    const opponentName = opponent.username;
    
    opponentCount.set(opponentName, (opponentCount.get(opponentName) || 0) + 1);
    opponentHistory.push({
      num: idx + 1,
      opponent: opponentName,
      game: `${m.contest.iplGame.team1.name} vs ${m.contest.iplGame.team2.name}`,
      date: m.contest.iplGame.gameDate.toLocaleString(),
      created: m.createdAt.toLocaleString()
    });
    
    console.log(`${idx + 1}. vs ${opponentName} - ${m.contest.iplGame.team1.name} vs ${m.contest.iplGame.team2.name}`);
  });
  
  console.log('\n📊 Opponent Frequency:\n');
  const sortedOpponents = [...opponentCount.entries()].sort((a, b) => b[1] - a[1]);
  sortedOpponents.forEach(([opponent, count]) => {
    console.log(`  ${opponent}: ${count} time${count > 1 ? 's' : ''}`);
  });
  
  // Check for recent rematches (within 3 games)
  console.log('\n⚠️  Recent Rematches (within 3 games):\n');
  let foundRematches = false;
  
  for (let i = 0; i < opponentHistory.length; i++) {
    const current = opponentHistory[i];
    const opponent = current.opponent;
    
    // Check if same opponent appears in next 3 games
    for (let j = i + 1; j < Math.min(i + 4, opponentHistory.length); j++) {
      if (opponentHistory[j].opponent === opponent) {
        console.log(`  Game #${current.num} vs ${opponent} → Game #${opponentHistory[j].num} (${j - i} games later)`);
        foundRematches = true;
      }
    }
  }
  
  if (!foundRematches) {
    console.log('  ✅ No rematches within 3 games found');
  }
  
  // Get all unique users who played in this tournament
  const allUsers = new Set();
  matchups.forEach(m => {
    allUsers.add(m.user1.user.username);
    allUsers.add(m.user2.user.username);
  });
  
  console.log(`\n👥 Total unique users in tournament: ${allUsers.size}`);
  console.log(`📊 ${testUsername} has faced ${opponentCount.size} unique opponents (${Math.round(opponentCount.size / allUsers.size * 100)}% of users)\n`);
  
  // Check cycle completion
  const uniqueOpponents = opponentCount.size;
  const availableOpponents = allUsers.size - 1; // exclude self
  
  if (uniqueOpponents >= availableOpponents) {
    console.log('✅ Cycle complete! User has faced all available opponents.');
  } else {
    console.log(`🔄 Cycle in progress: ${uniqueOpponents}/${availableOpponents} opponents faced`);
    console.log('   Unfaced opponents:', [...allUsers]
      .filter(u => u !== testUsername && !opponentCount.has(u))
      .join(', ') || 'None');
  }
}

testRoundRobin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
