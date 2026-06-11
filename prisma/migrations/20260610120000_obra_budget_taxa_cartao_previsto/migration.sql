-- Adiciona a taxa de cartão prevista ao snapshot orçamentário da obra.
ALTER TABLE "obra_budget_snapshots" ADD COLUMN "taxa_cartao_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00;
