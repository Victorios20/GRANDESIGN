/*
  Warnings:

  - You are about to drop the column `andaime_extra` on the `obra_budget_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `madeira_extra` on the `obra_budget_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `materiais_extra` on the `obra_budget_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `telha_extra` on the `obra_budget_snapshots` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "obra_budget_snapshots" DROP COLUMN "andaime_extra",
DROP COLUMN "madeira_extra",
DROP COLUMN "materiais_extra",
DROP COLUMN "telha_extra";
