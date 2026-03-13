# VC Settlement System - Implementation Guide

## Overview
The VC (Virtual Coin) Settlement System allows administrators to manage user balances on a tournament-by-tournament basis. Admins can:
- View winners (positive balance) and losers (negative balance)
- Encash VCs for winners (payout winnings)
- Refill VCs for losers (users add more funds)
- Track all settlement history

## Database Schema

### Settlement Table
```sql
model Settlement {
  id                    String   @id @default(cuid())
  tournamentBalanceId   String
  userId                String   // Denormalized for easy querying
  tournamentId          String   // Denormalized for easy querying
  type                  String   // "ENCASH" (for winners) or "REFILL" (for losers)
  amount                Int      // Amount settled (always positive)
  balanceBefore         Int      // Balance before settlement
  balanceAfter          Int      // Balance after settlement
  adminUsername         String   // Admin who performed settlement
  notes                 String?  // Optional notes
  createdAt             DateTime @default(now())
  
  tournamentBalance     TournamentBalance @relation(...)
}
```

## How It Works

### User Balance States
Each user has a tournament-specific balance:
- **Starting Balance**: 0 VCs per tournament
- **Net Balance**: Current Balance (starts at 0)
  - **Positive**: User is winning (can encash)
  - **Negative**: User is losing (can refill)
  - **Zero**: Break even (no wins/losses or fully settled)

### Encashment (Winners)
When a user wins VCs, admin can encash their winnings:
1. Verify user has positive net balance
2. Admin enters amount to encash (max = net winnings)
3. System deducts amount from user's balance
4. Records settlement with type "ENCASH"
5. User receives payout (external process)

**Example:**
- User balance: 500 VCs (won contests)
- Net winnings: +500 VCs
- Admin encashes: 300 VCs
- New balance: 200 VCs (still winning 200)

### Refill (Losers)
When a user loses VCs, they need to refill to continue playing:
1. Verify user has negative net balance
2. User pays admin (external process)
3. Admin enters refill amount
4. System adds amount to user's balance
5. Records settlement with type "REFILL"

**Example:**
- User balance: -300 VCs (lost contests)
- Net loss: -300 VCs (owes 300)
- User pays and admin refills: 300 VCs
- New balance: 0 VCs (back to starting)

## API Endpoints

### GET /api/admin/vc-balances
Fetch all user balances grouped by tournament.

**Query Parameters:**
- `tournamentId` (optional): Filter by specific tournament

**Response:**
```json
{
  "success": true,
  "data": {
    "tournament-id-1": {
      "tournament": { "id": "...", "name": "IPL 2024" },
      "winners": [...],      // Users with positive balance
      "losers": [...],       // Users with negative balance
      "breakEven": [...],    // Users at 1000 VCs
      "totalWinnings": 5000,
      "totalLosses": 3000,
      "netBalance": 2000
    }
  }
}
```

### POST /api/admin/vc-settle
Process an encashment or refill.

**Request Body:**
```json
{
  "tournamentBalanceId": "balance-id",
  "type": "ENCASH" | "REFILL",
  "amount": 500,
  "adminUsername": "admin",
  "notes": "Optional settlement notes"
}
```

**Validation:**
- ENCASH: Can only be done for positive balances, amount ≤ net winnings
- REFILL: Can only be done for negative balances

**Response:**
```json
{
  "success": true,
  "message": "Successfully encashed 500 VCs for John Doe",
  "data": {
    "user": { "name": "John Doe", ... },
    "tournament": { "name": "IPL 2024" },
    "type": "ENCASH",
    "amount": 500,
    "balanceBefore": 1500,
    "balanceAfter": 1000,
    "netBalanceBefore": 500,
    "netBalanceAfter": 0
  }
}
```

### GET /api/admin/settlement-history
View settlement history.

**Query Parameters:**
- `userId` (optional): Filter by user
- `tournamentId` (optional): Filter by tournament

**Response:**
```json
{
  "success": true,
  "settlements": [
    {
      "id": "...",
      "userName": "John Doe",
      "tournamentName": "IPL 2024",
      "type": "ENCASH",
      "amount": 500,
      "balanceBefore": 1500,
      "balanceAfter": 1000,
      "adminUsername": "admin",
      "notes": "Payout via bank transfer",
      "createdAt": "2024-03-12T10:30:00Z"
    }
  ]
}
```

## Admin UI

### Access
Navigate to: **Admin Dashboard → VC Settlement**
URL: `/admin/vc-management`

### Features

#### 1. Balance Overview (Default View)
- Filter by tournament or view all
- Summary cards showing:
  - Total winners with total winnings
  - Total losers with total losses
  - Break-even users
  - Net balance (winnings - losses)

#### 2. Winners Table
- Green-themed section
- Shows users with positive balances
- Displays:
  - User name and username
  - Current balance
  - Net winnings (same as current balance)
  - Total amount already settled
  - **Encash Button**: Click to settle winnings

#### 3. Losers Table
- Red-themed section
- Shows users with negative balances
- Displays:
  - User name and username
  - Current balance (negative)
  - Amount owed (absolute value of balance)
  - Total amount already settled
  - **Refill Button**: Click to add funds

#### 4. Settlement Process
1. Click "Encash" or "Refill" button
2. Input amount (validated against max)
3. Optionally add notes
4. Click confirm
5. Settlement is recorded
6. Balance updates immediately

#### 5. Settlement History
- Click "View History" button
- Table showing all past settlements:
  - Date and time
  - User details
  - Tournament
  - Type (Encash/Refill)
  - Amounts (before/after)
  - Admin who processed it
  - Notes

## Migration Setup

Before using the system, run the database migration:

```bash
npx prisma migrate dev --name add_settlement_tracking
```

This creates the `settlements` table.

## Business Logic

### Settlement Rules
1. **Encashment**:
   - Only for users with net balance > 0
   - Cannot encash more than net winnings
   - Reduces user's tournament balance
   - Represents payout to user

2. **Refill**:
   - Only for users with net balance < 0
   - User must pay admin first (external)
   - Increases user's tournament balance
   - Represents user adding funds

3. **Partial Settlements**:
   - Users can be settled multiple times
   - Track total settled amount
   - Can encash/refill in increments

### Example Workflow

**Winner Scenario:**
1. User wins contests, balance grows to 1500 VCs
2. Net winnings: +1500 VCs
3. User requests payout of 1000 VCs
4. Admin processes external payment
5. Admin encashes 1000 VCs in system
6. User balance: 500 VCs (still winning 500)
7. Later, user wants remaining 500 VCs
8. Admin encashes final 500 VCs
9. User balance: 0 VCs (back to start)

**Loser Scenario:**
1. User loses contests, balance drops to -400 VCs
2. Net loss: -400 VCs
3. User deposits 400 VCs via payment
4. Admin confirms payment received
5. Admin refills 400 VCs in system
6. User balance: 0 VCs (back to start)
7. User can continue playing

## Security Considerations

1. **Admin Authentication**: Only logged-in admins can access
2. **Validation**: Server-side checks prevent invalid settlements
3. **Audit Trail**: All settlements logged with admin username
4. **Transaction Safety**: Uses database transactions for consistency
5. **External Payments**: System doesn't handle money directly

## Future Enhancements

- Automatic settlement triggers
- Email notifications for settlements
- Export settlement reports
- Integration with payment gateways
- Bulk settlement processing
- Settlement approval workflow
- User settlement request system

## Troubleshooting

### Issue: "Cannot encash - user balance is not positive"
- User's net balance must be > 0 to encash
- Balance must be positive (greater than 0)

### Issue: "Cannot refill - user balance is not negative"
- Refills are only for users owing money
- User must have balance < 0

### Issue: Settlement not appearing
- Refresh the page
- Check settlement history view
- Verify database migration ran successfully

### Issue: Amount too large
- For encash: Amount cannot exceed net winnings
- For refill: No hard limit, but validate against what user paid

## Summary

The VC Settlement System provides complete financial management for tournament-based competitions:
- ✅ Clear visibility of winners and losers
- ✅ Safe encashment process for payouts
- ✅ Refill tracking for user payments
- ✅ Complete audit trail
- ✅ Tournament-specific balances
- ✅ Partial settlement support

Access via: **Admin Dashboard → VC Settlement**
