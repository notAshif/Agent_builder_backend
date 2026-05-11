/*
  Warnings:

  - Made the column `input` on table `ToolExecution` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ToolExecution" ALTER COLUMN "input" SET NOT NULL,
ALTER COLUMN "error" SET DATA TYPE TEXT;
