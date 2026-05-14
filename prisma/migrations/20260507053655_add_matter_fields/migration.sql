/*
  Warnings:

  - A unique constraint covering the columns `[cellId]` on the table `CellToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `CellToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Matter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CellToken" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Matter" ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "closeDate" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "openDate" TIMESTAMP(3),
ADD COLUMN     "practiceArea" TEXT,
ADD COLUMN     "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CellToken_cellId_key" ON "CellToken"("cellId");
