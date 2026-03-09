/*
  Warnings:

  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `challenges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `matches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verificationtokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `logo` on the `ipl_teams` table. All the data in the column will be lost.
  - You are about to drop the column `catches` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `runs` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `wickets` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `matchId` on the `teams` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteTeam` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `users` table. All the data in the column will be lost.
  - Added the required column `city` to the `ipl_teams` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ipl_teams` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `players` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `players` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `username` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "accounts_provider_providerAccountId_key";

-- DropIndex
DROP INDEX "sessions_sessionToken_key";

-- DropIndex
DROP INDEX "verificationtokens_identifier_token_key";

-- DropIndex
DROP INDEX "verificationtokens_token_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "accounts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "challenges";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "matches";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "sessions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "verificationtokens";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "player_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "matchDate" DATETIME,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "runOuts" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,
    "points" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entryFee" REAL NOT NULL DEFAULT 0,
    "prizePool" REAL NOT NULL DEFAULT 0,
    "maxEntries" INTEGER NOT NULL DEFAULT 100,
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "contest_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "points" REAL NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contest_entries_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contest_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contest_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ipl_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ipl_teams" ("color", "id", "name", "shortName") SELECT "color", "id", "name", "shortName" FROM "ipl_teams";
DROP TABLE "ipl_teams";
ALTER TABLE "new_ipl_teams" RENAME TO "ipl_teams";
CREATE UNIQUE INDEX "ipl_teams_name_key" ON "ipl_teams"("name");
CREATE UNIQUE INDEX "ipl_teams_shortName_key" ON "ipl_teams"("shortName");
CREATE TABLE "new_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "iplTeamId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jerseyNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "players_iplTeamId_fkey" FOREIGN KEY ("iplTeamId") REFERENCES "ipl_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_players" ("id", "iplTeamId", "name", "price") SELECT "id", "iplTeamId", "name", "price" FROM "players";
DROP TABLE "players";
ALTER TABLE "new_players" RENAME TO "players";
CREATE TABLE "new_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "captain" TEXT,
    "viceCaptain" TEXT,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_teams" ("captain", "createdAt", "id", "name", "totalPrice", "updatedAt", "userId", "viceCaptain") SELECT "captain", "createdAt", "id", "name", "totalPrice", "updatedAt", "userId", "viceCaptain" FROM "teams";
DROP TABLE "teams";
ALTER TABLE "new_teams" RENAME TO "teams";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "password", "phone", "totalMatches", "totalWins", "updatedAt", "username", "winPercentage") SELECT "createdAt", "email", "id", "name", "password", "phone", "totalMatches", "totalWins", "updatedAt", "username", "winPercentage" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "contest_entries_contestId_userId_teamId_key" ON "contest_entries"("contestId", "userId", "teamId");
