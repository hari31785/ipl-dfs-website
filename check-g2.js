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
  console.log(`Testing ${subs.length} subs:\n`);
  for (const [i, sub] of subs.entries()) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: `Test sub ${i+1}/${subs.length}`, body: `Created ${sub.createdAt.toISOString().slice(11,19)}`, url: '/dashboard' })
      );
      console.log(`[${i+1}] ✅ ALIVE | ${sub.endpoint.slice(0,70)}`);
    } catch (err) {
      console.log(`[${i+1}] ❌ DEAD (${err.statusCode}) | ${sub.endpoint.slice(0,70)}`);
    }
  }
}
main().finally(() => p.$disconnect());
