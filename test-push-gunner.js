const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
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

const p = new PrismaClient();
async function main() {
  const user = await p.user.findFirst({ where: { username: { contains: 'gunner', mode: 'insensitive' } } });
  const subs = await p.pushSubscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });

  console.log(`Found ${subs.length} subscription(s) for ${user.username}:`);
  subs.forEach((s, i) => {
    const type = s.endpoint.includes('web.push.apple.com') ? 'Apple' : s.endpoint.includes('fcm') ? 'FCM/Chrome' : 'Other';
    console.log(`  [${i+1}] ${type} | created: ${s.createdAt}`);
  });

  if (subs.length === 0) {
    console.log('\n❌ No subscriptions found — gunnerhari needs to open the app on mobile first so the self-heal kicks in.');
    return;
  }

  const payload = JSON.stringify({
    title: '🧪 Test Notification',
    body: 'This is a test push to verify your device is registered.',
    url: '/dashboard',
  });

  for (const [i, sub] of subs.entries()) {
    const type = sub.endpoint.includes('web.push.apple.com') ? 'Apple' : sub.endpoint.includes('fcm') ? 'Chrome/Android' : 'Other';
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      console.log(`\n✅ [${i+1}] ${type} — sent successfully`);
    } catch (err) {
      console.log(`\n❌ [${i+1}] ${type} — failed: status=${err.statusCode} ${err.body || ''}`);
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log('   → Subscription is expired/invalid (will be cleaned up next notification)');
      }
    }
  }
}
main().finally(() => p.$disconnect());
