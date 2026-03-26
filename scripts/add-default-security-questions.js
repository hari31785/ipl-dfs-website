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

async function addDefaultSecurityQuestions() {
  try {
    console.log('🔍 Finding users with null security questions...\n');

    // Find all users with null security questions
    const usersWithoutSecurity = await prisma.user.findMany({
      where: {
        OR: [
          { securityQuestion1: null },
          { securityQuestion2: null },
          { securityQuestion3: null }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        securityQuestion1: true,
        securityQuestion2: true,
        securityQuestion3: true
      }
    });

    if (usersWithoutSecurity.length === 0) {
      console.log('✅ All users already have security questions set!');
      return;
    }

    console.log(`Found ${usersWithoutSecurity.length} user(s) without security questions:\n`);
    usersWithoutSecurity.forEach(user => {
      console.log(`  - ${user.username} (${user.email || 'no email'})`);
    });

    console.log('\n📝 Setting default security questions and answers...\n');

    // Hash the default answers (lowercase and trimmed as per registration logic)
    const hashedAnswer1 = await bcrypt.hash(DEFAULT_SECURITY_DATA.answer1.toLowerCase().trim(), 12);
    const hashedAnswer2 = await bcrypt.hash(DEFAULT_SECURITY_DATA.answer2.toLowerCase().trim(), 12);
    const hashedAnswer3 = await bcrypt.hash(DEFAULT_SECURITY_DATA.answer3.toLowerCase().trim(), 12);

    // Update each user
    let successCount = 0;
    for (const user of usersWithoutSecurity) {
      try {
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
        console.log(`  ✅ Updated ${user.username}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to update ${user.username}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEFAULT SECURITY QUESTIONS ADDED');
    console.log('='.repeat(60));
    console.log(`\nSuccessfully updated ${successCount} out of ${usersWithoutSecurity.length} user(s)\n`);
    
    console.log('📋 Default Security Questions:');
    console.log(`   1. ${DEFAULT_SECURITY_DATA.question1}`);
    console.log(`      Answer: ${DEFAULT_SECURITY_DATA.answer1}`);
    console.log(`\n   2. ${DEFAULT_SECURITY_DATA.question2}`);
    console.log(`      Answer: ${DEFAULT_SECURITY_DATA.answer2}`);
    console.log(`\n   3. ${DEFAULT_SECURITY_DATA.question3}`);
    console.log(`      Answer: ${DEFAULT_SECURITY_DATA.answer3}`);
    console.log('\n💡 Users can now use the "Forgot Password" feature with these default answers.');
    console.log('   Answers are case-insensitive.\n');

  } catch (error) {
    console.error('❌ Error adding default security questions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultSecurityQuestions();
