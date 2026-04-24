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

  // Shuffle pool for base randomness, then sort so multi-entry users come first.
  // Processing most-constrained users first ensures they get spread across
  // different opponents before single-entry users are considered, preventing
  // a multi-entry user from being left with only themselves as a partner.
  const entryCount = new Map<string, number>();
  for (const s of signups) {
    entryCount.set(s.userId, (entryCount.get(s.userId) ?? 0) + 1);
  }
  const pool = secureShuffleArray([...signups]).sort(
    (a, b) => (entryCount.get(b.userId) ?? 1) - (entryCount.get(a.userId) ?? 1)
  );
  const paired: [SignupForPairing, SignupForPairing][] = [];
  const used = new Set<string>();
  // Track user-level pairs committed in this session so multi-entry users
  // don't face the same opponent across their entries.
  const sessionUserPairs = new Set<string>();

  // Greedy pass: for each unmatched signup (processed most-entries-first),
  // find the unmatched partner with fewest previous meetings in this tournament.
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
      const count = pairCount.get(sessionKey) ?? 0;
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
    } else {
      // No fresh pairing available — allow a rematch (ignore sessionUserPairs)
      // but NEVER pair a user against themselves.
      for (let j = i + 1; j < pool.length; j++) {
        if (used.has(pool[j].id)) continue;
        if (pool[j].userId === pool[i].userId) continue; // never self-pair
        paired.push([pool[i], pool[j]]);
        used.add(pool[i].id);
        used.add(pool[j].id);
        const sessionKey = [pool[i].userId, pool[j].userId].sort().join('|');
        sessionUserPairs.add(sessionKey);
        break;
      }
    }
  }

  // Safety net: pair any remaining unpaired users — never self-pair.
  const remaining = pool.filter(s => !used.has(s.id));
  const remainingUsed = new Set<string>();
  for (let i = 0; i < remaining.length; i++) {
    if (remainingUsed.has(remaining[i].id)) continue;
    for (let j = i + 1; j < remaining.length; j++) {
      if (remainingUsed.has(remaining[j].id)) continue;
      if (remaining[j].userId === remaining[i].userId) continue; // never self-pair
      paired.push([remaining[i], remaining[j]]);
      remainingUsed.add(remaining[i].id);
      remainingUsed.add(remaining[j].id);
      break;
    }
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
