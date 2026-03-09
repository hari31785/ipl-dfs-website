-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_draft_picks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pickedByUserId" TEXT NOT NULL,
    "pickOrder" INTEGER NOT NULL,
    "isBench" BOOLEAN NOT NULL DEFAULT false,
    "pickTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "draft_picks_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "head_to_head_matchups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "draft_picks_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_draft_picks" ("id", "matchupId", "pickOrder", "pickTimestamp", "pickedByUserId", "playerId") SELECT "id", "matchupId", "pickOrder", "pickTimestamp", "pickedByUserId", "playerId" FROM "draft_picks";
DROP TABLE "draft_picks";
ALTER TABLE "new_draft_picks" RENAME TO "draft_picks";
CREATE UNIQUE INDEX "draft_picks_matchupId_playerId_key" ON "draft_picks"("matchupId", "playerId");
CREATE UNIQUE INDEX "draft_picks_matchupId_pickOrder_key" ON "draft_picks"("matchupId", "pickOrder");
CREATE TABLE "new_player_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "iplGameId" TEXT NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "runOuts" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,
    "didNotPlay" BOOLEAN NOT NULL DEFAULT false,
    "points" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_player_stats" ("catches", "createdAt", "id", "iplGameId", "playerId", "points", "runOuts", "runs", "stumpings", "updatedAt", "wickets") SELECT "catches", "createdAt", "id", "iplGameId", "playerId", "points", "runOuts", "runs", "stumpings", "updatedAt", "wickets" FROM "player_stats";
DROP TABLE "player_stats";
ALTER TABLE "new_player_stats" RENAME TO "player_stats";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
