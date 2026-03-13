/*
  Warnings:

  - Added the required column `tournamentId` to the `ipl_games` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ipl_games" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "team1Id" TEXT NOT NULL,
    "team2Id" TEXT NOT NULL,
    "gameDate" DATETIME NOT NULL,
    "signupDeadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ipl_games_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ipl_games_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "ipl_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ipl_games_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "ipl_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ipl_games" ("createdAt", "description", "gameDate", "id", "signupDeadline", "status", "team1Id", "team2Id", "title", "updatedAt") SELECT "createdAt", "description", "gameDate", "id", "signupDeadline", "status", "team1Id", "team2Id", "title", "updatedAt" FROM "ipl_games";
DROP TABLE "ipl_games";
ALTER TABLE "new_ipl_games" RENAME TO "ipl_games";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_name_key" ON "tournaments"("name");
