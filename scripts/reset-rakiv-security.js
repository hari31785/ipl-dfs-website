const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Default security questions and answers
const DEFAULT_SECURITY_DATA = {
  question1: "What is your favorite color?",
  answer1: "blue",
  question2: "What is your favorite sport?",
  answer2: "cricket",
  question3: "What is your favorite team?",
  answer3: "india"
};

async function resetSecurityQuestionsForRakiv() {
  try {
    console.log('🔍 Finding user RakiV...\n');

    // Find RakiV user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: 'Rakiv', mode: 'insensitive' } },
          { name: { contains: 'Rakiv', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        securityQuestion1: true,
        securityQuestion2: true,
        securityQuestion3: true
      }
    });

    if (!user) {
      console.log('❌ User RakiV not found!');
      return;
    }

    console.log('✅ User Found:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log('\nCurrent Security Questions:');
    console.log(`   Q1: ${user.securityQuestion1 || 'null'}`);
    console.log(`   Q2: ${user.securityQuestion2 || 'null'}`);
    console.log(`   Q3: ${user.securityQuestion3 || 'null'}`);

    console.log('\n📝 Setting default security questions and answers...\n');

    // Hash the default answers (lowercase and trimmed as per registration logic)
    const hashedAnswer1 = await bcrypt.hash(DEFAULT_SECURITY_DATA.answer1.toLowerCase().trim(), 12);
    const hashedAnswer2 = await bcrypt.hash(DEFAULT_SECURITY_DATA.answer2.toLowerCase().trim(), 12);
    const hashedAnswer3 = await bcrypt.hash(DEFAULT_SECURITY_DATA.answer3.toLowerCase().trim(), 12);

    // Update user with default security questions
    await prisma.user.update({
      where: { id: user.id },
      data: {
        securityQuestion1: DEFAULT_SECURITY_DATA.question1,
        securityAnswer1: hashedAnswer1,
        securityQuestion2: DEFAULT_SECURITY_DATA.question2,
        securityAnswer2: hashedAnswer2,
        securityQuestion3: DEFAULT_SECURITY_DATA.question3,
        securityAnswer3: hashedAnswer3
      }
    });

    console.log('='.repeat(60));
    console.log('✅ DEFAULT SECURITY QUESTIONS SET FOR RAKIV');
    console.log('='.repeat(60));
    
    console.log('\n📋 Default Security Questions:');
    console.log(`   1. ${DEFAULT_SECURITY_DATA.question1}`);
    console.log(`      Answer: ${DEFAULT_SECURITY_DATA.answer1}`);
    console.log(`\n   2. ${DEFAULT_SECURITY_DATA.question2}`);
    console.log(`      Answer: ${DEFAULT_SECURITY_DATA.answer2}`);
    console.log(`\n   3. ${DEFAULT_SECURITY_DATA.question3}`);
    console.log(`      Answer: ${DEFAULT_SECURITY_DATA.answer3}`);
    console.log('\n💡 User RakiV can now use the "Forgot Password" feature with these default answers.');
    console.log('   Answers are case-insensitive.\n');

  } catch (error) {
    console.error('❌ Error setting default security questions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetSecurityQuestionsForRakiv();
