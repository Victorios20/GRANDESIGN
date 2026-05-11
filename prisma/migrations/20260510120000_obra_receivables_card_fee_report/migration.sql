-- Orcado vs Realizado: categorias extras do snapshot
ALTER TABLE "obra_budget_snapshots"
ADD COLUMN "comissao_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN "frete_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN "empresa_ps_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN "empresa_gd_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00;

-- Contas a receber automaticas da obra
ALTER TABLE "contas_receber"
ADD COLUMN "obra_id" INTEGER,
ADD COLUMN "origem_obra_tipo" VARCHAR(20),
ADD COLUMN "auto_gerado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "forma_pagamento_origem" VARCHAR(30);

CREATE INDEX "contas_receber_obra_id_idx" ON "contas_receber"("obra_id");

CREATE UNIQUE INDEX "ux_contas_receber_obra_origem_parcela"
ON "contas_receber"("obra_id", "origem_obra_tipo", "parcela_atual", "total_parcelas");

ALTER TABLE "contas_receber"
ADD CONSTRAINT "contas_receber_obra_id_fkey"
FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lancamento vinculado de taxa de cartao
ALTER TABLE "lancamentos"
ADD COLUMN "lancamento_origem_id" INTEGER;

CREATE INDEX "lancamentos_lancamento_origem_id_idx" ON "lancamentos"("lancamento_origem_id");

ALTER TABLE "lancamentos"
ADD CONSTRAINT "lancamentos_lancamento_origem_id_fkey"
FOREIGN KEY ("lancamento_origem_id") REFERENCES "lancamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
