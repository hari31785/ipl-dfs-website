const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const subs = await p.pushSubscription.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } } }
  });

  // Group by userId
  const byUser = {};
  for (const s of subs) {
    if (!byUser[s.userId]) byUser[s.userId] = { username: s.user.username, subs: [] };
    byUser[s.userId].subs.push(s);
  }

  const users = Object.values(byUser);
  console.log(`Total users with subscriptions: ${users.length}`);
  console.log(`Total subscriptions in DB: ${subs.length}\n`);

  // Check for duplicates (same endpoint prefix = likely same device session)
  let usersWithMultiple = 0;
  for (const u of users) {
    if (u.subs.length > 1) {
      usersWithMultiple++;
      console.log(`⚠️  ${u.username} has ${u.subs.length} subs:`);
      u.subs.forEach((s, i) => {
        const type = s.endpoint.includes('web.push.apple.com') ? 'Apple'
          : s.endpoint.includes('fcm.googleapis.com') ? 'FCM/Chrome' : 'Other';
        console.log(`   [${i+1}] ${type} | ${s.createdAt} | ${s.endpoint.slice(0,60)}`);
      });
      console.log('');
    }
  }
  if (usersWithMultiple === 0) console.log('No users with multiple subscriptions.');

  console.log(`\nUsers with exactly 1 sub: ${users.filter(u => u.subs.length === 1).length}`);
  console.log(`Users with 2+ subs: ${usersWithMultiple}`);
}
main().finally(() => p.$disconnect());
