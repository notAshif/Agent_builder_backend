/*
  Warnings:

  - Made the column `config` on table `AgentTools` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AgentTools" ALTER COLUMN "config" SET NOT NULL;
