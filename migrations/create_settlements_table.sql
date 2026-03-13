-- Create settlements table for VC settlement tracking
CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    "tournamentBalanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ENCASH', 'REFILL')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "adminUsername" TEXT NOT NULL,
    notes TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_tournament_balance
        FOREIGN KEY ("tournamentBalanceId")
        REFERENCES tournament_balances(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settlements_user_tournament 
    ON settlements("userId", "tournamentId");

CREATE INDEX IF NOT EXISTS idx_settlements_tournament 
    ON settlements("tournamentId");

CREATE INDEX IF NOT EXISTS idx_settlements_created_at 
    ON settlements("createdAt" DESC);
