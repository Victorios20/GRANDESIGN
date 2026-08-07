-- IF NOT EXISTS: a coluna também é adicionada por 20260610120000_obra_budget_taxa_cartao_previsto
-- (mesma coluna, criada de forma independente na branch hml e reconciliada nesta branch depois).
ALTER TABLE "obra_budget_snapshots"
ADD COLUMN IF NOT EXISTS "taxa_cartao_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00;
