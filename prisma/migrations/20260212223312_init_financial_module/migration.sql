-- CreateEnum
CREATE TYPE "TipoContaBancaria" AS ENUM ('Corrente', 'Poupança', 'Caixa Físico', 'Carteira Digital', 'Investimento');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('Receita', 'Despesa');

-- CreateEnum
CREATE TYPE "StatusFinanceiro" AS ENUM ('Pendente', 'Pago', 'Parcial', 'Atrasado', 'Cancelado');

-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('Mensal', 'Semanal', 'Anual', 'Trimestral');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('Receita', 'Despesa');

-- DropIndex
DROP INDEX "idx_obras_status";

-- DropIndex
DROP INDEX "idx_orcamento_lancado_obra";

-- DropIndex
DROP INDEX "idx_pedido_compra_status";

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "tipo" "TipoContaBancaria" NOT NULL DEFAULT 'Corrente',
    "banco" VARCHAR(100),
    "agencia" VARCHAR(20),
    "conta" VARCHAR(30),
    "saldo_inicial" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "saldo_atual" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "cor" VARCHAR(7),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "cor" VARCHAR(7),
    "icone" VARCHAR(50),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "categoria_pai_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_custo" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" VARCHAR(500),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "obra_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "valor_total" DECIMAL(15,2) NOT NULL,
    "valor_pago" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "data_emissao" DATE NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "data_pagamento" DATE,
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'Pendente',
    "numero_documento" VARCHAR(50),
    "observacoes" TEXT,
    "anexos" TEXT,
    "parcela_atual" INTEGER NOT NULL DEFAULT 1,
    "total_parcelas" INTEGER NOT NULL DEFAULT 1,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "frequencia" "FrequenciaRecorrencia",
    "fornecedor_id" INTEGER,
    "categoria_id" INTEGER NOT NULL,
    "centro_custo_id" INTEGER,
    "pedido_compra_id" INTEGER,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "valor_total" DECIMAL(15,2) NOT NULL,
    "valor_recebido" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "data_emissao" DATE NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "data_recebimento" DATE,
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'Pendente',
    "numero_documento" VARCHAR(50),
    "observacoes" TEXT,
    "anexos" TEXT,
    "parcela_atual" INTEGER NOT NULL DEFAULT 1,
    "total_parcelas" INTEGER NOT NULL DEFAULT 1,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "frequencia" "FrequenciaRecorrencia",
    "cliente_id" INTEGER,
    "orcamento_id" INTEGER,
    "categoria_id" INTEGER NOT NULL,
    "centro_custo_id" INTEGER,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "data_lancamento" DATE NOT NULL,
    "data_competencia" DATE NOT NULL,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "conta_bancaria_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "centro_custo_id" INTEGER,
    "conta_pagar_id" INTEGER,
    "conta_receber_id" INTEGER,
    "transferencia_id" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "data_transferencia" DATE NOT NULL,
    "conta_origem_id" INTEGER NOT NULL,
    "conta_destino_id" INTEGER NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categorias_categoria_pai_id_idx" ON "categorias"("categoria_pai_id");

-- CreateIndex
CREATE INDEX "categorias_tipo_idx" ON "categorias"("tipo");

-- CreateIndex
CREATE INDEX "centros_custo_obra_id_idx" ON "centros_custo"("obra_id");

-- CreateIndex
CREATE INDEX "contas_pagar_status_idx" ON "contas_pagar"("status");

-- CreateIndex
CREATE INDEX "contas_pagar_data_vencimento_idx" ON "contas_pagar"("data_vencimento");

-- CreateIndex
CREATE INDEX "contas_pagar_fornecedor_id_idx" ON "contas_pagar"("fornecedor_id");

-- CreateIndex
CREATE INDEX "contas_receber_status_idx" ON "contas_receber"("status");

-- CreateIndex
CREATE INDEX "contas_receber_data_vencimento_idx" ON "contas_receber"("data_vencimento");

-- CreateIndex
CREATE INDEX "contas_receber_cliente_id_idx" ON "contas_receber"("cliente_id");

-- CreateIndex
CREATE INDEX "lancamentos_conta_bancaria_id_idx" ON "lancamentos"("conta_bancaria_id");

-- CreateIndex
CREATE INDEX "lancamentos_data_lancamento_idx" ON "lancamentos"("data_lancamento");

-- CreateIndex
CREATE INDEX "lancamentos_data_competencia_idx" ON "lancamentos"("data_competencia");

-- CreateIndex
CREATE INDEX "lancamentos_tipo_idx" ON "lancamentos"("tipo");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_categoria_pai_id_fkey" FOREIGN KEY ("categoria_pai_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "pedido_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_conta_pagar_id_fkey" FOREIGN KEY ("conta_pagar_id") REFERENCES "contas_pagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_conta_receber_id_fkey" FOREIGN KEY ("conta_receber_id") REFERENCES "contas_receber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_transferencia_id_fkey" FOREIGN KEY ("transferencia_id") REFERENCES "transferencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_conta_origem_id_fkey" FOREIGN KEY ("conta_origem_id") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_conta_destino_id_fkey" FOREIGN KEY ("conta_destino_id") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
