-- CreateEnum
CREATE TYPE "PropostaStatus" AS ENUM ('Rascunho', 'Enviada');

-- CreateTable
CREATE TABLE "proposta_servico" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "descricao_servico" TEXT NOT NULL,
    "dimensoes" TEXT,
    "status" "PropostaStatus" NOT NULL DEFAULT 'Rascunho',
    "custo_mao_obra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custo_materiais" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custo_frete" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lucro" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_final" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "forma_pagamento" TEXT,
    "prazo_execucao" TEXT,
    "validade" DATE,
    "observacoes" TEXT,
    "link_pdf" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposta_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposta_servico_item" (
    "id" SERIAL NOT NULL,
    "proposta_id" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "proposta_servico_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposta_servico_cliente_id_idx" ON "proposta_servico"("cliente_id");

-- CreateIndex
CREATE INDEX "proposta_servico_status_created_at_idx" ON "proposta_servico"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "proposta_servico_item_proposta_id_idx" ON "proposta_servico_item"("proposta_id");

-- AddForeignKey
ALTER TABLE "proposta_servico" ADD CONSTRAINT "proposta_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposta_servico_item" ADD CONSTRAINT "proposta_servico_item_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "proposta_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
