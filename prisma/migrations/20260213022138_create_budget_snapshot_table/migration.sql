-- CreateTable
CREATE TABLE "obra_budget_snapshots" (
    "id" SERIAL NOT NULL,
    "obra_id" INTEGER NOT NULL,
    "receita_orcada" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "mao_de_obra_orcada" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "materiais_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "madeira_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "telha_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "andaime_previsto" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "materiais_extra" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "madeira_extra" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "telha_extra" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "andaime_extra" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obra_budget_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "obra_budget_snapshots_obra_id_key" ON "obra_budget_snapshots"("obra_id");

-- AddForeignKey
ALTER TABLE "obra_budget_snapshots" ADD CONSTRAINT "obra_budget_snapshots_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
