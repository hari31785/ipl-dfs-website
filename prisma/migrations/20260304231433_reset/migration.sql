/*
  Warnings:

  - You are about to drop the column `description` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `entryFee` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `maxEntries` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `prizePool` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `totalEntries` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `matchDate` on the `player_stats` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `players` table. All the data in the column will be lost.
  - Added the required column `coinValue` to the `contests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contestType` to the `contests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iplGameId` to the `contests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iplGameId` to the `player_stats` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ipl_games" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "team1Id" TEXT NOT NULL,
    "team2Id" TEXT NOT NULL,
    "gameDate" DATETIME NOT NULL,
    "signupDeadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ipl_games_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "ipl_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ipl_games_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "ipl_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contest_signups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signupAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contest_signups_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contest_signups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "head_to_head_matchups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contestId" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "firstPickUser" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING_DRAFT',
    "user1Score" REAL NOT NULL DEFAULT 0,
    "user2Score" REAL NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "head_to_head_matchups_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "head_to_head_matchups_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "contest_signups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "head_to_head_matchups_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "contest_signups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "draft_picks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pickedByUserId" TEXT NOT NULL,
    "pickOrder" INTEGER NOT NULL,
    "pickTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "draft_picks_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "head_to_head_matchups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "draft_picks_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iplGameId" TEXT NOT NULL,
    "contestType" TEXT NOT NULL,
    "coinValue" INTEGER NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 100,
    "totalSignups" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SIGNUP_OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contests_iplGameId_fkey" FOREIGN KEY ("iplGameId") REFERENCES "ipl_games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_contests" ("createdAt", "id", "status", "updatedAt") SELECT "createdAt", "id", "status", "updatedAt" FROM "contests";
DROP TABLE "contests";
ALTER TABLE "new_contests" RENAME TO "contests";
CREATE TABLE "new_player_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "iplGameId" TEXT NOT NULL,
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
INSERT INTO "new_player_stats" ("catches", "createdAt", "id", "playerId", "points", "runOuts", "runs", "stumpings", "updatedAt", "wickets") SELECT "catches", "createdAt", "id", "playerId", "points", "runOuts", "runs", "stumpings", "updatedAt", "wickets" FROM "player_stats";
DROP TABLE "player_stats";
ALTER TABLE "new_player_stats" RENAME TO "player_stats";
CREATE TABLE "new_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "iplTeamId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jerseyNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "players_iplTeamId_fkey" FOREIGN KEY ("iplTeamId") REFERENCES "ipl_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_players" ("createdAt", "id", "iplTeamId", "isActive", "jerseyNumber", "name", "role", "updatedAt") SELECT "createdAt", "id", "iplTeamId", "isActive", "jerseyNumber", "name", "role", "updatedAt" FROM "players";
DROP TABLE "players";
ALTER TABLE "new_players" RENAME TO "players";
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
    "coins" INTEGER NOT NULL DEFAULT 1000,
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
CREATE UNIQUE INDEX "contest_signups_contestId_userId_key" ON "contest_signups"("contestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "draft_picks_matchupId_playerId_key" ON "draft_picks"("matchupId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "draft_picks_matchupId_pickOrder_key" ON "draft_picks"("matchupId", "pickOrder");
