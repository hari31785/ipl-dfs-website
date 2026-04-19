import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export type SignupForPairing = {
  id: string;     // ContestSignup.id
  userId: string; // User.id
};

/** Cryptographically secure Fisher-Yates shuffle */
function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Pairs signups for a contest, preferring to avoid rematches within the same
 * tournament. Falls back to a rematch only when no fresh pairing is possible.
 *
 * @param seedPairs - Optional set of user-pair keys ("uid1|uid2" sorted) that
 *   were already committed in a previous contest during the same batch run.
 *   These are treated as if they already happened today (high penalty).
 *
 * Returns an ordered array of [user1, user2] pairs ready for matchup creation.
 */
export async function fairPairSignups(
  signups: SignupForPairing[],
  tournamentId: string,
  currentContestId: string,
  prisma: PrismaClient,
  seedPairs?: Set<string>
): Promise<[SignupForPairing, SignupForPairing][]> {
  const SAME_DAY_PENALTY = 1000; // effectively ban same-day rematches

  // Fetch all past USER-level pairings in this tournament (excluding current contest)
  const pastMatchups = await prisma.headToHeadMatchup.findMany({
    where: {
      contest: {
        iplGame: { tournamentId },
      },
      contestId: { not: currentContestId },
    },
    select: {
      user1: { select: { userId: true } },
      user2: { select: { userId: true } },
      createdAt: true,
    },
  });

  // Count how many times each pair has played (to prefer least-played pairings).
  // Pairings created TODAY get a large penalty to prevent same-day rematches
  // even when two contests are closed in rapid succession.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const pairCount = new Map<string, number>();
  for (const m of pastMatchups) {
    const key = [m.user1.userId, m.user2.userId].sort().join('|');
    const weight = m.createdAt >= todayStart ? SAME_DAY_PENALTY : 1;
    pairCount.set(key, (pairCount.get(key) ?? 0) + weight);
  }

  // Also apply the same-day penalty to any pairs passed in from the calling
  // batch (e.g. auto-close processing multiple contests in one cron run).
  if (seedPairs) {
    for (const key of seedPairs) {
      pairCount.set(key, (pairCount.get(key) ?? 0) + SAME_DAY_PENALTY);
    }
  }

  // Shuffle pool for base randomness
  const pool = secureShuffleArray([...signups]);
  const paired: [SignupForPairing, SignupForPairing][] = [];
  const used = new Set<string>();
  // Track user-level pairs committed in this session so multi-entry users
  // don't face the same opponent across their two entries.
  const sessionUserPairs = new Set<string>();

  // Greedy pass: for each unmatched user, find the unmatched partner with
  // fewest (ideally 0) previous meetings in this tournament.
  for (let i = 0; i < pool.length; i++) {
    if (used.has(pool[i].id)) continue;

    let bestPartnerIdx = -1;
    let bestCount = Infinity;

    for (let j = i + 1; j < pool.length; j++) {
      if (used.has(pool[j].id)) continue;
      // Never pair a user against themselves (multi-entry guard)
      if (pool[j].userId === pool[i].userId) continue;
      // Skip if these two users are already matched elsewhere in this session
      const sessionKey = [pool[i].userId, pool[j].userId].sort().join('|');
      if (sessionUserPairs.has(sessionKey)) continue;
      const key = sessionKey;
      const count = pairCount.get(key) ?? 0;
      if (count < bestCount) {
        bestCount = count;
        bestPartnerIdx = j;
        if (count === 0) break; // can't do better than a fresh pairing
      }
    }

    if (bestPartnerIdx !== -1) {
      paired.push([pool[i], pool[bestPartnerIdx]]);
      used.add(pool[i].id);
      used.add(pool[bestPartnerIdx].id);
      const sessionKey = [pool[i].userId, pool[bestPartnerIdx].userId].sort().join('|');
      sessionUserPairs.add(sessionKey);
    }
  }

  // Safety net: pair any remaining unpaired users (shouldn't happen with even counts)
  const remaining = pool.filter(s => !used.has(s.id));
  for (let i = 0; i < remaining.length - 1; i += 2) {
    paired.push([remaining[i], remaining[i + 1]]);
  }

  return paired;
}

/**
 * Extracts the set of user-level pair keys ("uid1|uid2" sorted) from a list
 * of committed pairs. Useful for building a cross-contest accumulator.
 */
export function extractPairKeys(
  pairs: [SignupForPairing, SignupForPairing][]
): Set<string> {
  const keys = new Set<string>();
  for (const [a, b] of pairs) {
    keys.add([a.userId, b.userId].sort().join('|'));
  }
  return keys;
}
