const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleContests() {
  try {
    const sampleContests = [
      {
        title: "IPL 2026 Opening Match Contest",
        description: "Join our exciting opening match contest with amazing prizes! Pick your fantasy team and compete against other cricket fans.",
        entryFee: 50,
        prizePool: 10000,
        maxEntries: 200,
        startTime: new Date('2026-03-15T19:30:00'),
        endTime: new Date('2026-03-15T23:30:00'),
        status: 'UPCOMING'
      },
      {
        title: "Weekend Mega Contest",
        description: "Weekend special with double prizes and more excitement. Free entry for all new users!",
        entryFee: 0,
        prizePool: 5000,
        maxEntries: 500,
        startTime: new Date('2026-03-20T14:00:00'),
        endTime: new Date('2026-03-22T18:00:00'),
        status: 'UPCOMING'
      },
      {
        title: "Mid-Season Championship",
        description: "The biggest contest of the season with massive prize pool. Premium entry with guaranteed rewards for top 50 players.",
        entryFee: 200,
        prizePool: 100000,
        maxEntries: 1000,
        startTime: new Date('2026-04-15T19:30:00'),
        endTime: new Date('2026-04-15T23:30:00'),
        status: 'UPCOMING'
      },
      {
        title: "Quick Match Challenge",
        description: "Fast-paced single match contest. Quick entry, quick results, quick wins!",
        entryFee: 25,
        prizePool: 2500,
        maxEntries: 100,
        startTime: new Date('2026-03-10T15:30:00'),
        endTime: new Date('2026-03-10T19:30:00'),
        status: 'LIVE'
      },
      {
        title: "Beginner's Special",
        description: "Perfect for new players to learn and win. Lower entry fee with decent prizes and helpful tips.",
        entryFee: 10,
        prizePool: 1000,
        maxEntries: 150,
        startTime: new Date('2026-02-28T19:30:00'),
        endTime: new Date('2026-02-28T23:30:00'),
        status: 'COMPLETED'
      }
    ];

    for (const contestData of sampleContests) {
      try {
        const contest = await prisma.contest.create({
          data: contestData
        });
        console.log(`✅ Created contest: ${contest.title}`);
      } catch (error) {
        console.log(`❌ Failed to create contest "${contestData.title}": ${error.message}`);
      }
    }

    console.log("🎉 Sample contests created successfully!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleContests();