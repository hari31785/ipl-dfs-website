/**
 * One-off script: resend win/loss push notifications for RCB v GT (2026-04-24)
 * with the updated title that includes the point margin.
 *
 * Usage: node scripts/resend-rcb-gt-notifications.js
 */

const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendToUser(userId, payload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      console.log(`  ✓ sent to userId ${userId}`);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        console.log(`  ✗ expired sub removed for userId ${userId}`);
      } else {
        console.error(`  ✗ push failed for userId ${userId}:`, err.message);
      }
    }
  }
  if (subs.length === 0) console.log(`  – no subscriptions for userId ${userId}`);
}

async function main() {
  // Load all matchups for today's RCB v GT game with user info
  const game = await prisma.iPLGame.findFirst({
    where: { gameDate: { gte: new Date('2026-04-24'), lt: new Date('2026-04-25') } },
    include: {
      team1: true,
      team2: true,
      contests: {
        include: {
          matchups: {
            include: {
              user1: { include: { user: true } },
              user2: { include: { user: true } },
            }
          }
        }
      }
    }
  });

  if (!game) { console.error('Game not found'); process.exit(1); }

  const gameTitle = `${game.team1.shortName} vs ${game.team2.shortName}`;
  console.log(`\nResending notifications for: ${gameTitle}\n`);

  for (const contest of game.contests) {
    const coinLabel = `${contest.coinValue}-coin`;
    const contestLabel = `${gameTitle} ${coinLabel} contest`;

    for (const m of contest.matchups) {
      const u1 = m.user1.user;
      const u2 = m.user2.user;
      const s1 = m.user1Score;
      const s2 = m.user2Score;
      const diff = Math.abs(s1 - s2);
      const diffStr = diff % 1 === 0 ? diff.toFixed(0) : diff.toFixed(1);
      const isTie = m.winnerId === null;

      const getTitleFor = (userId) => {
        if (isTie) return "🤝 It's a tie!";
        const won = m.winnerId === (userId === u1.id ? m.user1.id : m.user2.id);
        return won ? `🏆 You won by ${diffStr} pts!` : `😔 You lost by ${diffStr} pts`;
      };
      const getBodyFor = (opponent, won) => {
        if (isTie) return `You tied with ${opponent} in the ${contestLabel}. Log in to check your scores.`;
        return won
          ? `You beat ${opponent} in the ${contestLabel}. Log in to check your scores!`
          : `You lost to ${opponent} in the ${contestLabel}. Log in to check your scores.`;
      };

      const u1Won = !isTie && m.winnerId === m.user1.id;
      const u2Won = !isTie && m.winnerId === m.user2.id;

      console.log(`[${coinLabel}] ${u1.username} (${s1}) vs ${u2.username} (${s2}) | diff=${diffStr} | tie=${isTie}`);

      await sendToUser(u1.id, {
        title: isTie ? "🤝 It's a tie!" : (u1Won ? `🏆 You won by ${diffStr} pts!` : `😔 You lost by ${diffStr} pts`),
        body: getBodyFor(u2.username, u1Won),
        icon: '/icon-192.png',
        url: `/scores/${m.id}?from=completed`,
      });

      await sendToUser(u2.id, {
        title: isTie ? "🤝 It's a tie!" : (u2Won ? `🏆 You won by ${diffStr} pts!` : `😔 You lost by ${diffStr} pts`),
        body: getBodyFor(u1.username, u2Won),
        icon: '/icon-192.png',
        url: `/scores/${m.id}?from=completed`,
      });
    }
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
