-- Adiciona a taxa de cartão prevista ao snapshot orçamentário da obra.
-- IF NOT EXISTS: a coluna já pode existir via 20260521120000_add_taxa_cartao_previsto
-- (aplicada de forma independente na branch hml e trazida depois para esta branch).
ALTER TABLE "obra_budget_snapshots" ADD COLUMN IF NOT EXISTS "taxa_cartao_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00;
