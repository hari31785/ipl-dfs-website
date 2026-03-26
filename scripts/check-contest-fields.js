const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContestFields() {
  try {
    const contestId = 'cmn6t9sfi0005si8pw4tt0qmw';
    
    const contest = await prisma.contest.findUnique({
      where: { id: contestId }
    });

    console.log('Raw contest data:');
    console.log(JSON.stringify(contest, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkContestFields();
