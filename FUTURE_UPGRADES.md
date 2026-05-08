# Future Upgrade Ideas

A running document of planned improvements, architectural decisions, and deferred features.

---

## 1. Admin Fee Model Redesign

### Background
Current fee model charges 10% of gross winnings **per contest individually**. This is unfair when a user plays multiple contests in the same game — e.g., Win VC50 + Lose VC50 = net zero profit, but still pays VC5 in fees.

### Proposed: Configurable Fee Mode Per Tournament

Add a `feeMode` field to the `Tournament` model with two options:

| Mode | Description | When to Use |
|---|---|---|
| `PER_CONTEST` | Current behavior — fee charged per matchup win | Simple one-off contests |
| `PER_GAME` | Fee charged once per game on net winnings across all contests | IPL-style (multiple contest types per game) |

`PER_TOURNAMENT` is explicitly **out of scope** — too complex, too late to settle.

### Fairness Comparison

| Scenario | PER_CONTEST (current) | PER_GAME (proposed) |
|---|---|---|
| Win VC50 only | −VC5 fee | −VC5 fee (same) |
| Lose VC50 only | No fee | No fee (same) |
| Win VC50 + Lose VC50 | −VC5 fee (unfair) | No fee ✅ |
| Win VC100 + Lose VC50 | −VC10 fee on win | −VC5 fee on net VC50 ✅ |

### Schema Changes Required (small, backward-compatible)

1. **`Tournament` model** — add `feeMode String @default("PER_CONTEST")`
   - Existing tournaments default to `PER_CONTEST` — zero behavioral change
2. **`CoinTransaction` model** — add `iplGameId String?` (nullable)
   - Used for `FEE` type transactions that are game-level, not contest-level
   - Old WIN/LOSS rows have `null` here — untouched
3. **`type` field on `CoinTransaction`** — add `"FEE"` as valid value (alongside `WIN`, `LOSS`)

### Settlement Flow for PER_GAME

1. End All contests in a game → settle each matchup at **gross** (`adminFee = 0` on WIN rows)
2. After all contests settled → loop each user who participated in that game
3. Calculate `netCoins = sum of all WIN amounts - sum of all LOSS amounts` for that game
4. If `netCoins > 0` → write one `FEE` transaction: `amount = -floor(netCoins * 0.10)`
5. Increment `AdminCoins.totalCoins` from FEE transactions only

### Coin Vault Display for PER_GAME

Each game produces N contest rows + 1 FEE row (if net positive):

```
MI vs RCB  VC100  vs Mahee   WON   +VC25.00
MI vs RCB  VC50   vs Gunner  LOST  −VC12.50
🏛️ Platform Fee  MI vs RCB  (10% on net VC12.50)  −VC1.25
──────────────────────────────────────────────────
Net: +VC11.25
```

FEE rows render with amber/orange background (similar to ENCASH/REFILL rows today). No opponent, no score — just game info and fee amount.

### Files That Need Changing

- `prisma/schema.prisma` — add `feeMode`, `iplGameId`, document FEE type
- `src/app/api/admin/contests/[id]/end/route.ts` — branch on `feeMode`, skip fee for PER_GAME
- `src/app/admin/contests/page.tsx` — End All button triggers game-level FEE calculation
- `src/app/api/admin/matchups/[id]/resettle/route.ts` — recalc game FEE after resettle
- `src/app/api/admin/games/[id]/recertify/route.ts` — recalc game FEE after recertify
- `src/app/coin-vault/page.tsx` — render FEE transaction type rows
- `src/app/scores/[matchupId]/ScoresClient.tsx` — show gross coins (fee is game-level now)

### Migration Strategy

- **Phase 1**: Schema changes + implement PER_GAME settlement in End All flow
- **Phase 2**: When creating next tournament (IPL 2026 Season 2 etc.), set `feeMode = PER_GAME`
- **Existing IPL 2026 data**: Keep `PER_CONTEST` — no resettlement needed

---

## 2. Individual End Contest Button Removal

### Background
Currently admins can end individual contests one at a time OR use "End All" for a game. With PER_GAME fee mode, individual end buttons would produce incorrect partial fee calculations.

### Proposal
- **Remove** individual End Contest buttons from the contests list page
- **Keep** the End All button as the primary settlement flow
- **Keep** individual end in the contest detail page (`/admin/contests/[id]`) for emergency edge cases

### Status: Deferred until Fee Model Redesign is implemented

---

## 3. Contest Type Fee Differentiation

### Background
Could potentially charge different fee rates for different contest types (VC50 vs VC100 vs VC200).

### Decision: Out of scope for now
Flat 10% across all contest types is simple and consistent. Revisit only if there's a specific business reason.

---

## 4. Fee Dashboard for Admins

### Idea
A dedicated admin page showing:
- Total fees collected (already in `AdminCoins.totalCoins`)
- Fee breakdown by tournament / game / date range
- Per-user fee history
- Fee rate trends over time

### Status: Low priority, possible future addition

---

*Last updated: May 2026*
