/*
  Warnings:

  - You are about to drop the column `region` on the `Cell` table. All the data in the column will be lost.
  - You are about to drop the column `accessToken` on the `CellToken` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `CellToken` table. All the data in the column will be lost.
  - You are about to drop the column `rawData` on the `Matter` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `Matter` table. All the data in the column will be lost.
  - You are about to drop the `WebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Cell` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptedAccessToken` to the `CellToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptedRefreshToken` to the `CellToken` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CellStatus" AS ENUM ('PENDING_CONNECTION', 'CONNECTED', 'SYNCING', 'SYNC_FAILED', 'DISCONNECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SyncEntity" AS ENUM ('MATTERS', 'CONTACTS', 'BILLS', 'TASKS', 'DOCUMENTS', 'ACTIVITIES');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- DropForeignKey
ALTER TABLE "CellToken" DROP CONSTRAINT "CellToken_cellId_fkey";

-- DropForeignKey
ALTER TABLE "Matter" DROP CONSTRAINT "Matter_cellId_fkey";

-- AlterTable
ALTER TABLE "Cell" DROP COLUMN "region",
ADD COLUMN     "status" "CellStatus" NOT NULL DEFAULT 'PENDING_CONNECTION',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CellToken" DROP COLUMN "accessToken",
DROP COLUMN "refreshToken",
ADD COLUMN     "encryptedAccessToken" TEXT NOT NULL,
ADD COLUMN     "encryptedRefreshToken" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Matter" DROP COLUMN "rawData",
DROP COLUMN "value";

-- DropTable
DROP TABLE "WebhookEvent";

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "entity" "SyncEntity" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsUpserted" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterContact" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "MatterContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "clioContactId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Person',
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "matterId" TEXT,
    "clioBillId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issuedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "matterId" TEXT,
    "clioTaskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "dueDate" TIMESTAMP(3),
    "assigneeName" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "matterId" TEXT,
    "clioDocumentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "versionCount" INTEGER NOT NULL DEFAULT 1,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "matterId" TEXT,
    "clioActivityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "activityDate" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncLog_cellId_entity_idx" ON "SyncLog"("cellId", "entity");

-- CreateIndex
CREATE INDEX "SyncLog_cellId_startedAt_idx" ON "SyncLog"("cellId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatterContact_matterId_contactId_key" ON "MatterContact"("matterId", "contactId");

-- CreateIndex
CREATE INDEX "Contact_cellId_idx" ON "Contact"("cellId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_cellId_clioContactId_key" ON "Contact"("cellId", "clioContactId");

-- CreateIndex
CREATE INDEX "Bill_cellId_status_idx" ON "Bill"("cellId", "status");

-- CreateIndex
CREATE INDEX "Bill_cellId_matterId_idx" ON "Bill"("cellId", "matterId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_cellId_clioBillId_key" ON "Bill"("cellId", "clioBillId");

-- CreateIndex
CREATE INDEX "Task_cellId_status_idx" ON "Task"("cellId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Task_cellId_clioTaskId_key" ON "Task"("cellId", "clioTaskId");

-- CreateIndex
CREATE INDEX "Document_cellId_matterId_idx" ON "Document"("cellId", "matterId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_cellId_clioDocumentId_key" ON "Document"("cellId", "clioDocumentId");

-- CreateIndex
CREATE INDEX "Activity_cellId_matterId_idx" ON "Activity"("cellId", "matterId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_cellId_clioActivityId_key" ON "Activity"("cellId", "clioActivityId");

-- CreateIndex
CREATE INDEX "Matter_cellId_status_idx" ON "Matter"("cellId", "status");

-- CreateIndex
CREATE INDEX "Matter_cellId_openDate_idx" ON "Matter"("cellId", "openDate");

-- AddForeignKey
ALTER TABLE "CellToken" ADD CONSTRAINT "CellToken_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterContact" ADD CONSTRAINT "MatterContact_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterContact" ADD CONSTRAINT "MatterContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
