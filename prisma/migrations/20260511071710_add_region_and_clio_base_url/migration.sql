/*
  Warnings:

  - A unique constraint covering the columns `[cellId,clioMatterId]` on the table `Matter` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `region` to the `Cell` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "region" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CellToken" ADD COLUMN     "clioBaseUrl" TEXT NOT NULL DEFAULT 'https://app.clio.com';

-- CreateIndex
CREATE UNIQUE INDEX "Matter_cellId_clioMatterId_key" ON "Matter"("cellId", "clioMatterId");
