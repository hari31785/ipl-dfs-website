-- Migration: Add entryNumber to contest_signups for multi-entry support
-- Run this against the production database before deploying the code changes.

-- Step 1: Add the new column with default value 1 (all existing signups become Entry #1)
ALTER TABLE contest_signups ADD COLUMN entry_number INTEGER NOT NULL DEFAULT 1;

-- Step 2: Drop the old unique constraint (contestId + userId)
ALTER TABLE contest_signups DROP CONSTRAINT IF EXISTS contest_signups_contestId_userId_key;

-- Step 3: Add new unique constraint (contestId + userId + entryNumber)
ALTER TABLE contest_signups ADD CONSTRAINT contest_signups_contestId_userId_entryNumber_key
  UNIQUE ("contestId", "userId", entry_number);

-- Verify
SELECT COUNT(*) AS total_signups, COUNT(DISTINCT ("contestId", "userId")) AS unique_user_contest_pairs
FROM contest_signups;
