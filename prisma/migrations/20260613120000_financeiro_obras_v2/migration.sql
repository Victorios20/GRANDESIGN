-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "auto_gerado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "obra_id" INTEGER,
ADD COLUMN     "origem_obra_tipo" VARCHAR(20);

-- AlterTable
ALTER TABLE "equipes" ADD COLUMN     "fornecedor_id" INTEGER,
ADD COLUMN     "preferencial" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notificacao_email_config" (
    "id" INTEGER NOT NULL,
    "emails_destinatarios" TEXT NOT NULL,
    "notificar_conta_pagar" BOOLEAN NOT NULL DEFAULT true,
    "notificar_conta_receber" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificacao_email_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_pagar_obra_id_idx" ON "contas_pagar"("obra_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_contas_pagar_obra_origem_parcela" ON "contas_pagar"("obra_id", "origem_obra_tipo", "parcela_atual", "total_parcelas");

-- CreateIndex
CREATE INDEX "equipes_fornecedor_id_idx" ON "equipes"("fornecedor_id");

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
