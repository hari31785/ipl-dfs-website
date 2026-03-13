-- CreateTable
CREATE TABLE "admin_coins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalCoins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

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
    CONSTRAINT "coin_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_coin_transactions" ("amount", "balance", "contestId", "createdAt", "description", "id", "matchupId", "type", "userId") SELECT "amount", "balance", "contestId", "createdAt", "description", "id", "matchupId", "type", "userId" FROM "coin_transactions";
DROP TABLE "coin_transactions";
ALTER TABLE "new_coin_transactions" RENAME TO "coin_transactions";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "winPercentage" REAL NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("coins", "createdAt", "email", "id", "name", "password", "phone", "totalMatches", "totalWins", "updatedAt", "username", "winPercentage") SELECT "coins", "createdAt", "email", "id", "name", "password", "phone", "totalMatches", "totalWins", "updatedAt", "username", "winPercentage" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
