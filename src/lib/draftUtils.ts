/**
 * Utilities for snake-draft turn calculation with optional bench waiver support.
 *
 * The `firstPickUser` field on HeadToHeadMatchup stores both the toss winner
 * AND bench waiver flags using a simple colon-separated encoding:
 *
 *   'user1'          → user1 picks first, no waivers
 *   'user1:w1'       → user1 picks first, user1 waived bench
 *   'user1:w2'       → user1 picks first, user2 waived bench
 *   'user1:w1:w2'    → user1 picks first, both waived bench
 *   'user2:w2'       → user2 picks first, user2 waived bench
 *   etc.
 *
 * user1/user2 here refer to the ContestSignup records (matchup.user1.id / matchup.user2.id).
 */

export function parseFirstPickUser(firstPickUser: string | null | undefined) {
  const raw = firstPickUser || '';
  const base = raw.split(':')[0] as 'user1' | 'user2' | '';
  return {
    firstPick: (base || null) as 'user1' | 'user2' | null,
    user1WaivedBench: raw.includes(':w1'),
    user2WaivedBench: raw.includes(':w2'),
  };
}

export function buildFirstPickUser(
  firstPick: 'user1' | 'user2',
  user1Waived: boolean,
  user2Waived: boolean
): string {
  let result: string = firstPick;
  if (user1Waived) result += ':w1';
  if (user2Waived) result += ':w2';
  return result;
}

/**
 * Returns the ordered list of ContestSignup IDs for each effective pick slot,
 * skipping any bench turn (slot > 10) belonging to a user who waived bench.
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
  const { firstPick, user1WaivedBench, user2WaivedBench } = parseFirstPickUser(firstPickUser);
  if (!firstPick) return [];

  const firstPicker  = firstPick === 'user1' ? user1SignupId : user2SignupId;
  const secondPicker = firstPick === 'user1' ? user2SignupId : user1SignupId;

  const slots: string[] = [];
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
    const isWaived =
      isBenchSlot &&
      ((whoPicks === user1SignupId && user1WaivedBench) ||
       (whoPicks === user2SignupId && user2WaivedBench));

    if (!isWaived) slots.push(whoPicks);
  }
  return slots;
}
