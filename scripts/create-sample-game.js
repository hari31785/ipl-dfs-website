const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleIPLGame() {
  try {
    // Get first two teams for the sample game
    const teams = await prisma.iPLTeam.findMany({
      take: 2,
      orderBy: { name: 'asc' }
    });

    if (teams.length < 2) {
      console.log('❌ Not enough teams found. Please run the team creation script first.');
      return;
    }

    // Create game date (tomorrow) and signup deadline (today 8 PM EST)
    const gameDate = new Date();
    gameDate.setDate(gameDate.getDate() + 1);
    gameDate.setHours(19, 30, 0, 0); // 7:30 PM tomorrow

    const signupDeadline = new Date();
    signupDeadline.setHours(20, 0, 0, 0); // 8:00 PM today EST

    const sampleGame = {
      title: `${teams[0].shortName} vs ${teams[1].shortName} - IPL 2026 Match 1`,
      description: "Opening match of IPL 2026 season. Join the excitement with our head-to-head fantasy contests!",
      team1Id: teams[0].id,
      team2Id: teams[1].id,
      gameDate: gameDate,
      signupDeadline: signupDeadline,
      status: 'UPCOMING'
    };

    // Create the IPL game
    const game = await prisma.iPLGame.create({
      data: sampleGame,
      include: {
        team1: true,
        team2: true
      }
    });

    console.log(`✅ Created IPL Game: ${game.title}`);

    // Create contest types for this game
    const contestTypes = [
      { type: '25_COIN', value: 25 },
      { type: '50_COIN', value: 50 },
      { type: '100_COIN', value: 100 }
    ];

    for (const { type, value } of contestTypes) {
      const contest = await prisma.contest.create({
        data: {
          iplGameId: game.id,
          contestType: type,
          coinValue: value,
          maxParticipants: 100,
          status: 'SIGNUP_OPEN'
        }
      });
      console.log(`✅ Created ${type} contest (${value} coins per point)`);
    }

    console.log("🎉 Sample IPL game and contests created successfully!");
    console.log(`Game: ${game.title}`);
    console.log(`Date: ${game.gameDate.toLocaleString()}`);
    console.log(`Signup Deadline: ${game.signupDeadline.toLocaleString()}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleIPLGame();