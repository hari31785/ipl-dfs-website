/*
  Warnings:

  - Added the required column `tournamentId` to the `players` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add tournament ID column with temporary default,
-- then set it based on existing tournament and remove default
DO $$
DECLARE
  default_tournament_id TEXT;
BEGIN
  -- Get the first tournament ID (you should update this query if you need a specific tournament)
  SELECT id INTO default_tournament_id FROM tournaments LIMIT 1;
  
  -- Add column with temporary default
  ALTER TABLE "players" ADD COLUMN "tournamentId" TEXT;
  
  -- Update all existing players with the default tournament
  UPDATE "players" SET "tournamentId" = default_tournament_id;
  
  -- Make column NOT NULL and add foreign key
  ALTER TABLE "players" ALTER COLUMN "tournamentId" SET NOT NULL;
  ALTER TABLE "players" ADD CONSTRAINT "players_tournamentId_fkey" 
    FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "players_name_tournamentId_iplTeamId_key" ON "players"("name", "tournamentId", "iplTeamId");
