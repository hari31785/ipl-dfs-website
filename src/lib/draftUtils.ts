/**
 * Utilities for snake-draft turn calculation with optional bench waiver support.
 *
 * The `firstPickUser` field on HeadToHeadMatchup stores both the toss winner
 * AND bench waiver flags using a simple colon-separated encoding:
 *
 *   'user1'          → user1 picks first, no waivers
 *   'user1:w1'       → user1 picks first, user1 ended draft (skip BOTH bench slots)
 *   'user1:w2'       → user1 picks first, user2 ended draft (skip BOTH bench slots)
 *   'user1:w1:w2'    → user1 picks first, both ended draft with no bench
 *   'user1:h1'       → user1 picks first, user1 ended draft after 1 bench pick (skip 2nd bench only)
 *   'user1:h2'       → user1 picks first, user2 ended draft after 1 bench pick (skip 2nd bench only)
 *   'user2:w2'       → user2 picks first, user2 ended draft
 *   etc.
 *
 * user1/user2 here refer to the ContestSignup records (matchup.user1.id / matchup.user2.id).
 */

export function parseFirstPickUser(firstPickUser: string | null | undefined) {
  const raw = firstPickUser || '';
  const base = raw.split(':')[0] as 'user1' | 'user2' | '';
  return {
    firstPick: (base || null) as 'user1' | 'user2' | null,
    user1WaivedBench: raw.includes(':w1'), // ended with 0 bench (skip both)
    user2WaivedBench: raw.includes(':w2'),
    user1HalfWaived: raw.includes(':h1'),  // ended with 1 bench (skip 2nd slot only)
    user2HalfWaived: raw.includes(':h2'),
  };
}

export function buildFirstPickUser(
  firstPick: 'user1' | 'user2',
  user1Waived: boolean,
  user2Waived: boolean,
  user1HalfWaived?: boolean,
  user2HalfWaived?: boolean,
): string {
  let result: string = firstPick;
  if (user1Waived)     result += ':w1';
  if (user2Waived)     result += ':w2';
  if (user1HalfWaived) result += ':h1';
  if (user2HalfWaived) result += ':h2';
  return result;
}

/**
 * Returns the ordered list of ContestSignup IDs for each effective pick slot.
 *
 * :w1/:w2  → skip BOTH bench slots for that user
 * :h1/:h2  → skip only the SECOND bench slot for that user (first bench already picked)
 *
 * @param firstPickUser  - raw firstPickUser field value from the matchup
 * @param user1SignupId  - matchup.user1.id  (ContestSignup ID)
 * @param user2SignupId  - matchup.user2.id  (ContestSignup ID)
 */
export function getEffectivePickSlots(
  firstPickUser: string | null | undefined,
  user1SignupId: string,
  user2SignupId: string
): string[] {
  const { firstPick, user1WaivedBench, user2WaivedBench, user1HalfWaived, user2HalfWaived } = parseFirstPickUser(firstPickUser);
  if (!firstPick) return [];

  const firstPicker  = firstPick === 'user1' ? user1SignupId : user2SignupId;
  const secondPicker = firstPick === 'user1' ? user2SignupId : user1SignupId;

  const slots: string[] = [];
  let user1BenchNum = 0;
  let user2BenchNum = 0;

  for (let slot = 1; slot <= 14; slot++) {
    const round      = Math.ceil(slot / 2);
    const isOddRound = round % 2 === 1;

    let whoPicks: string;
    if (isOddRound) {
      whoPicks = slot % 2 === 1 ? firstPicker : secondPicker;
    } else {
      whoPicks = slot % 2 === 0 ? firstPicker : secondPicker;
    }

    const isBenchSlot = slot > 10;
    let thisBenchNum = 0;
    if (isBenchSlot) {
      if (whoPicks === user1SignupId) { user1BenchNum++; thisBenchNum = user1BenchNum; }
      else                           { user2BenchNum++; thisBenchNum = user2BenchNum; }
    }

    // Full waive: skip both bench slots
    const isFullWaived =
      isBenchSlot &&
      ((whoPicks === user1SignupId && user1WaivedBench) ||
       (whoPicks === user2SignupId && user2WaivedBench));

    // Half waive: skip only the 2nd bench slot (user already made their 1st bench pick)
    const isHalfWaived =
      isBenchSlot && thisBenchNum === 2 &&
      ((whoPicks === user1SignupId && user1HalfWaived) ||
       (whoPicks === user2SignupId && user2HalfWaived));

    if (!isFullWaived && !isHalfWaived) slots.push(whoPicks);
  }
  return slots;
}
