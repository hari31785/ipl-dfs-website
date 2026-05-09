/*
  Warnings:

  - A unique constraint covering the columns `[contestId,userId,entry_number]` on the table `contest_signups` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "contest_signups_contestId_userId_key";

-- AlterTable
ALTER TABLE "coin_transactions" ADD COLUMN     "captainBonusApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "captainBonusCoins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "contest_signups" ADD COLUMN     "entry_number" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "head_to_head_matchups" ADD COLUMN     "captainAgreedUser1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "captainAgreedUser2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "captainDeclined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "captainEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user1CaptainPickId" TEXT,
ADD COLUMN     "user2CaptainPickId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contest_signups_contestId_userId_entry_number_key" ON "contest_signups"("contestId", "userId", "entry_number");
