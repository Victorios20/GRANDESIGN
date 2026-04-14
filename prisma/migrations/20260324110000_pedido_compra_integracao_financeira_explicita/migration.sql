DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'IntegracaoFinanceiraStatus'
  ) THEN
    CREATE TYPE "IntegracaoFinanceiraStatus" AS ENUM ('Nao integrado', 'Integrado', 'Estornado');
  END IF;
END $$;

ALTER TABLE "pedido_compra"
  ADD COLUMN IF NOT EXISTS "financeiro_integracao_status" "IntegracaoFinanceiraStatus" NOT NULL DEFAULT 'Nao integrado',
  ADD COLUMN IF NOT EXISTS "financeiro_integrado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "financeiro_integrado_por" INTEGER,
  ADD COLUMN IF NOT EXISTS "financeiro_estornado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "financeiro_estornado_por" INTEGER;

ALTER TABLE "contas_pagar"
  ADD COLUMN IF NOT EXISTS "cancelamento_tipo" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "cancelado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelado_por" INTEGER,
  ADD COLUMN IF NOT EXISTS "cancelamento_observacao" TEXT;

CREATE INDEX IF NOT EXISTS "contas_pagar_pedido_compra_id_idx" ON "contas_pagar"("pedido_compra_id");
