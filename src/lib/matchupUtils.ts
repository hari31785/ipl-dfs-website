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
 * Calculate which opponents each user should avoid based on round-robin cycle logic.
 * A user's "cycle" consists of all opponents they must face before repeating any.
 * Once a user has faced all available opponents, their cycle resets.
 * 
 * @returns Map of userId -> Set of opponent IDs they've already faced in current cycle
 */
function calculateRoundRobinCycles(
  signups: SignupForPairing[],
  pastMatchups: Array<{ user1: { userId: string }, user2: { userId: string } }>
): Map<string, Set<string>> {
  // Build map of all potential opponents for each user
  const allUsers = new Set(signups.map(s => s.userId));
  const userOpponents = new Map<string, Set<string>>();
  
  for (const userId of allUsers) {
    const potentialOpponents = new Set([...allUsers].filter(id => id !== userId));
    userOpponents.set(userId, potentialOpponents);
  }
  
  // Build map of which opponents each user has faced in tournament history
  const facedOpponents = new Map<string, Set<string>>();
  for (const userId of allUsers) {
    facedOpponents.set(userId, new Set());
  }
  
  for (const matchup of pastMatchups) {
    const u1 = matchup.user1.userId;
    const u2 = matchup.user2.userId;
    facedOpponents.get(u1)?.add(u2);
    facedOpponents.get(u2)?.add(u1);
  }
  
  // Calculate current cycle state for each user
  const currentCycleOpponents = new Map<string, Set<string>>();
  
  for (const userId of allUsers) {
    const potential = userOpponents.get(userId)!;
    const faced = facedOpponents.get(userId)!;
    
    // Get unfaced opponents in current cycle
    const unfaced = new Set([...potential].filter(id => !faced.has(id)));
    
    // If unfaced is empty, cycle is complete - reset by clearing faced opponents
    // If unfaced has opponents, those are the ones we should prioritize
    // For cycle tracking, we store who they've FACED (to exclude from random selection)
    if (unfaced.size === 0) {
      // Cycle complete - no opponents to exclude, all are available
      currentCycleOpponents.set(userId, new Set());
    } else {
      // Cycle in progress - exclude already faced opponents
      currentCycleOpponents.set(userId, faced);
    }
  }
  
  return currentCycleOpponents;
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
  contestType?: string,
  seedPairs?: Set<string>
): Promise<[SignupForPairing, SignupForPairing][]> {
  const SAME_DAY_PENALTY = 1000; // effectively ban same-day rematches

  // Fetch past USER-level pairings scoped to the same contest type in this tournament.
  // Scoping by contestType ensures 100c history drives 100c pairing, 50c drives 50c, etc.
  // This means the round-robin cycle, hard-ban, and recency weights all operate
  // within the same tier so small pools in one tier don't pollute others.
  const pastMatchups = await prisma.headToHeadMatchup.findMany({
    where: {
      contest: {
        iplGame: { tournamentId },
        ...(contestType ? { contestType } : {}),
      },
      contestId: { not: currentContestId },
    },
    select: {
      contestId: true,
      user1: { select: { userId: true } },
      user2: { select: { userId: true } },
      createdAt: true,
    },
  });

  // ── Option B: Recency Decay ──────────────────────────────────────────────
  // Rank past contests from most recent (rank 0) to oldest.
  // Weights: rank 0 = 8, rank 1 = 4, rank 2 = 2, rank 3+ = 1
  // This makes a match played last contest count 8× more than one from 4+ contests ago,
  // so the algorithm strongly prefers opponents you haven't faced recently.
  const contestDates = new Map<string, Date>();
  for (const m of pastMatchups) {
    const existing = contestDates.get(m.contestId);
    if (!existing || m.createdAt > existing) {
      contestDates.set(m.contestId, m.createdAt);
    }
  }
  const sortedContestIds = [...contestDates.entries()]
    .sort((a, b) => b[1].getTime() - a[1].getTime()) // most recent first
    .map(([id]) => id);
  const contestRankMap = new Map<string, number>();
  sortedContestIds.forEach((id, idx) => contestRankMap.set(id, idx));

  function getRecencyWeight(contestId: string): number {
    const rank = contestRankMap.get(contestId) ?? 99;
    if (rank === 0) return 8;
    if (rank === 1) return 4;
    if (rank === 2) return 2;
    return 1;
  }
  // ────────────────────────────────────────────────────────────────────────

  // Count how many times each pair has played (to prefer least-played pairings).
  // Pairings created TODAY get a large penalty to prevent same-day rematches
  // even when two contests are closed in rapid succession.
  // Non-same-day pairings now use recency decay weight instead of flat 1 (Option B).
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const pairCount = new Map<string, number>();
  for (const m of pastMatchups) {
    const key = [m.user1.userId, m.user2.userId].sort().join('|');
    const weight = m.createdAt >= todayStart ? SAME_DAY_PENALTY : getRecencyWeight(m.contestId);
    pairCount.set(key, (pairCount.get(key) ?? 0) + weight);
  }

  // Also apply the same-day penalty to any pairs passed in from the calling
  // batch (e.g. auto-close processing multiple contests in one cron run).
  if (seedPairs) {
    for (const key of seedPairs) {
      pairCount.set(key, (pairCount.get(key) ?? 0) + SAME_DAY_PENALTY);
    }
  }

  // ── Option E: Last 3 Opponents Hard Ban ─────────────────────────────────
  // For each user, find their 3 most recent unique opponents and hard-ban
  // those pairings. The algorithm will only fall back to them if there is
  // literally no other available partner.
  const userRecentOpponents = new Map<string, Array<{ opponentId: string; createdAt: Date }>>();
  for (const m of pastMatchups) {
    const u1 = m.user1.userId, u2 = m.user2.userId;
    if (!userRecentOpponents.has(u1)) userRecentOpponents.set(u1, []);
    if (!userRecentOpponents.has(u2)) userRecentOpponents.set(u2, []);
    userRecentOpponents.get(u1)!.push({ opponentId: u2, createdAt: m.createdAt });
    userRecentOpponents.get(u2)!.push({ opponentId: u1, createdAt: m.createdAt });
  }

  // Hard-ban set: contains "uid1|uid2" sorted keys for last-3-opponent pairs
  const hardBanPairs = new Set<string>();
  for (const [userId, opponents] of userRecentOpponents) {
    // Sort by most recent, collect last 3 unique opponent userIds
    const sorted = [...opponents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const last3: string[] = [];
    const seen = new Set<string>();
    for (const o of sorted) {
      if (!seen.has(o.opponentId)) {
        seen.add(o.opponentId);
        last3.push(o.opponentId);
        if (last3.length === 3) break;
      }
    }
    for (const oppId of last3) {
      hardBanPairs.add([userId, oppId].sort().join('|'));
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── Round-Robin Cycle Tracking ───────────────────────────────────────────
  // Calculate which opponents each user has already faced in their current cycle.
  // When a user has faced all available opponents, their cycle automatically resets.
  const cycleOpponents = calculateRoundRobinCycles(signups, pastMatchups);
  // ────────────────────────────────────────────────────────────────────────

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

  // Hybrid pass: for each unmatched signup (processed most-entries-first),
  // filter candidates to unfaced opponents in current round-robin cycle,
  // then randomly select from the filtered pool using Fisher-Yates.
  // If no unfaced opponents exist (cycle complete), all opponents become available.
  // Hard-banned pairs (last 3 opponents) are skipped unless no other option exists.
  for (let i = 0; i < pool.length; i++) {
    if (used.has(pool[i].id)) continue;

    const currentUserId = pool[i].userId;
    const currentUserCycleFaced = cycleOpponents.get(currentUserId) ?? new Set();
    
    // Collect all eligible candidates (unfaced in cycle, not hard-banned, not same user)
    const eligibleCandidates: Array<{ idx: number; userId: string; weight: number; }> = [];
    
    for (let j = i + 1; j < pool.length; j++) {
      if (used.has(pool[j].id)) continue;
      if (pool[j].userId === currentUserId) continue; // never self-pair
      
      const sessionKey = [currentUserId, pool[j].userId].sort().join('|');
      if (sessionUserPairs.has(sessionKey)) continue;
      if (hardBanPairs.has(sessionKey)) continue; // skip hard-banned pairs
      
      // Check if opponent is unfaced in current cycle
      if (!currentUserCycleFaced.has(pool[j].userId)) {
        const weight = pairCount.get(sessionKey) ?? 0;
        eligibleCandidates.push({ idx: j, userId: pool[j].userId, weight });
      }
    }

    let bestPartnerIdx = -1;

    // If we have eligible unfaced candidates, use weighted random selection
    // Lower weights (less recent/frequent) have higher probability of selection
    if (eligibleCandidates.length > 0) {
      if (eligibleCandidates.length === 1) {
        // Only one option, take it
        bestPartnerIdx = eligibleCandidates[0].idx;
      } else {
        // Weighted random selection: inverse weights for probability
        // Find max weight to calculate inverse probabilities
        const maxWeight = Math.max(...eligibleCandidates.map(c => c.weight));
        const minWeight = Math.min(...eligibleCandidates.map(c => c.weight));
        
        // If all weights are the same, do pure random selection
        if (maxWeight === minWeight) {
          const shuffled = secureShuffleArray(eligibleCandidates);
          bestPartnerIdx = shuffled[0].idx;
        } else {
          // Calculate inverse probabilities (lower weight = higher probability)
          // Use (maxWeight - weight + 1) to ensure all candidates have non-zero probability
          const probabilities = eligibleCandidates.map(c => maxWeight - c.weight + 1);
          const totalProb = probabilities.reduce((sum, p) => sum + p, 0);
          
          // Generate random value and select candidate based on cumulative probability
          const randomValue = Math.random() * totalProb;
          let cumulative = 0;
          let selectedIdx = 0;
          
          for (let k = 0; k < eligibleCandidates.length; k++) {
            cumulative += probabilities[k];
            if (randomValue <= cumulative) {
              selectedIdx = k;
              break;
            }
          }
          
          bestPartnerIdx = eligibleCandidates[selectedIdx].idx;
        }
      }
    } else {
      // No unfaced candidates available (cycle complete or all are hard-banned/unavailable)
      // Fall back to weighted selection from all non-hard-banned candidates
      let bestCount = Infinity;
      
      for (let j = i + 1; j < pool.length; j++) {
        if (used.has(pool[j].id)) continue;
        if (pool[j].userId === currentUserId) continue; // never self-pair
        
        const sessionKey = [currentUserId, pool[j].userId].sort().join('|');
        if (sessionUserPairs.has(sessionKey)) continue;
        if (hardBanPairs.has(sessionKey)) continue; // skip hard-banned pairs
        
        const count = pairCount.get(sessionKey) ?? 0;
        if (count < bestCount) {
          bestCount = count;
          bestPartnerIdx = j;
          if (count === 0) break; // can't do better than a fresh pairing
        }
      }
    }

    if (bestPartnerIdx !== -1) {
      paired.push([pool[i], pool[bestPartnerIdx]]);
      used.add(pool[i].id);
      used.add(pool[bestPartnerIdx].id);
      const sessionKey = [pool[i].userId, pool[bestPartnerIdx].userId].sort().join('|');
      sessionUserPairs.add(sessionKey);
    } else {
      // No ideal pairing available — relax hard-ban (fallback) but
      // still prefer least-played. NEVER pair a user against themselves.
      let fallbackIdx = -1;
      let fallbackCount = Infinity;
      for (let j = i + 1; j < pool.length; j++) {
        if (used.has(pool[j].id)) continue;
        if (pool[j].userId === currentUserId) continue; // never self-pair
        const sessionKey = [currentUserId, pool[j].userId].sort().join('|');
        if (sessionUserPairs.has(sessionKey)) continue;
        const count = pairCount.get(sessionKey) ?? 0;
        if (count < fallbackCount) {
          fallbackCount = count;
          fallbackIdx = j;
        }
      }

      if (fallbackIdx !== -1) {
        paired.push([pool[i], pool[fallbackIdx]]);
        used.add(pool[i].id);
        used.add(pool[fallbackIdx].id);
        const sessionKey = [pool[i].userId, pool[fallbackIdx].userId].sort().join('|');
        sessionUserPairs.add(sessionKey);
      } else {
        // Absolute last resort: ignore sessionUserPairs too, never self-pair
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
