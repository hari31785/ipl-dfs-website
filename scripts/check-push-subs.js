const webpush = require('web-push');
// Load env manually since dotenv may not be installed globally
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || 'gunnerhari';
  const user = await prisma.user.findFirst({
    where: { username: { contains: username, mode: 'insensitive' } },
    include: { pushSubscriptions: true }
  });

  if (!user) { console.log('User not found'); return; }
  console.log(`User: ${user.username} (${user.id})`);
  console.log(`Subscriptions in DB: ${user.pushSubscriptions.length}\n`);

  const deadIds = [];
  for (const sub of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: '🔔 Test', body: 'Notification check' })
      );
      console.log(`✅ LIVE   | created: ${sub.createdAt} | ${sub.endpoint.slice(0, 60)}`);
    } catch (err) {
      console.log(`❌ DEAD [${err.statusCode}] | created: ${sub.createdAt} | ${sub.endpoint.slice(0, 60)}`);
      if (err.statusCode === 404 || err.statusCode === 410) deadIds.push(sub.endpoint);
    }
  }

  if (deadIds.length > 0) {
    console.log(`\nCleaning up ${deadIds.length} dead subscription(s)...`);
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: deadIds } } });
    console.log('Done.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
