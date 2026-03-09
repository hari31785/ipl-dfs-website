-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_coin_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "matchupId" TEXT,
    "contestId" TEXT,
    "adminFee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coin_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coin_transactions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_coin_transactions" ("adminFee", "amount", "balance", "contestId", "createdAt", "description", "id", "matchupId", "type", "userId") SELECT "adminFee", "amount", "balance", "contestId", "createdAt", "description", "id", "matchupId", "type", "userId" FROM "coin_transactions";
DROP TABLE "coin_transactions";
ALTER TABLE "new_coin_transactions" RENAME TO "coin_transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
