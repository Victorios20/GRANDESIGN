DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConferenciaStatus') THEN
    CREATE TYPE "ConferenciaStatus" AS ENUM ('OPEN', 'LOCKED', 'REOPENED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NaturezaRendimento') THEN
    CREATE TYPE "NaturezaRendimento" AS ENUM ('TRIBUTAVEL', 'NAO_TRIBUTAVEL', 'EXCLUSIVA_FONTE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusConferencia') THEN
    CREATE TYPE "StatusConferencia" AS ENUM ('PENDENTE', 'CONFERIDO', 'PENDENCIA');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "conferencia_sessoes" (
  "id" SERIAL NOT NULL,
  "periodo_inicio" DATE NOT NULL,
  "periodo_fim" DATE NOT NULL,
  "conta_bancaria_id" INTEGER,
  "status" "ConferenciaStatus" NOT NULL DEFAULT 'OPEN',
  "criada_por" INTEGER NOT NULL,
  "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concluida_por" INTEGER,
  "concluida_em" TIMESTAMP(3),
  "reopened_by" INTEGER,
  "reopened_at" TIMESTAMP(3),
  "reopen_reason" TEXT,
  "nota" TEXT,
  "qtd_conferidas" INTEGER NOT NULL DEFAULT 0,
  "qtd_pendencias" INTEGER NOT NULL DEFAULT 0,
  "total_conferido" DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  CONSTRAINT "conferencia_sessoes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conferencia_sessoes_conta_bancaria_id_fkey'
  ) THEN
    ALTER TABLE "conferencia_sessoes"
      ADD CONSTRAINT "conferencia_sessoes_conta_bancaria_id_fkey"
      FOREIGN KEY ("conta_bancaria_id") REFERENCES "contas_bancarias"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "lancamentos"
  DROP COLUMN IF EXISTS "conciliado",
  ADD COLUMN IF NOT EXISTS "conferencia_sessao_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "conferido_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "conferido_por" INTEGER,
  ADD COLUMN IF NOT EXISTS "pendencia_motivo" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "status_conferencia" "StatusConferencia" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lancamentos_conferencia_sessao_id_fkey'
  ) THEN
    ALTER TABLE "lancamentos"
      ADD CONSTRAINT "lancamentos_conferencia_sessao_id_fkey"
      FOREIGN KEY ("conferencia_sessao_id") REFERENCES "conferencia_sessoes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
