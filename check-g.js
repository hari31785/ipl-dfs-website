const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
webpush.setVapidDetails(process.env.VAPID_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const p = new PrismaClient();
async function main() {
  const user = await p.user.findFirst({ where: { username: { contains: 'gunner', mode: 'insensitive' } } });
  const subs = await p.pushSubscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
  console.log(`Subs: ${subs.length}\n`);

  const alive = [];
  for (const [i, sub] of subs.entries()) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: 'Test', body: `Sub ${i+1}`, url: '/dashboard' })
      );
      console.log(`[${i+1}] ✅ ALIVE | ${sub.createdAt}`);
      alive.push(sub);
    } catch (err) {
      console.log(`[${i+1}] ❌ DEAD (${err.statusCode}) | ${sub.createdAt}`);
    }
  }

  // Delete dead subs
  const deadEndpoints = subs.filter(s => !alive.find(a => a.endpoint === s.endpoint)).map(s => s.endpoint);
  if (deadEndpoints.length > 0) {
    await p.pushSubscription.deleteMany({ where: { endpoint: { in: deadEndpoints } } });
    console.log(`\nCleaned up ${deadEndpoints.length} dead sub(s)`);
  }
  console.log(`\nRemaining alive subs: ${alive.length}`);
}
main().finally(() => p.$disconnect());
