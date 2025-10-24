-- CreateEnum
CREATE TYPE "public"."ObraStatus" AS ENUM ('Assinatura de contrato', 'Aguardando validação técnica', 'Compras', 'À iniciar', 'Execução', 'Aguardando pagamento', 'Pendência', 'Finalizado');

-- CreateEnum
CREATE TYPE "public"."PagamentoStatus" AS ENUM ('Pendente', 'Efetuado');

-- CreateEnum
CREATE TYPE "public"."PedidoStatusPadrao" AS ENUM ('Pendente', 'Aguardando pagamento', 'Pedido feito', 'Entregue');

-- CreateEnum
CREATE TYPE "public"."PedidoStatusMateriais" AS ENUM ('Pendente', 'Em estoque', 'Entregue');

-- CreateEnum
CREATE TYPE "public"."PedidoStatusAndaimes" AS ENUM ('Pendente', 'Pedido feito', 'Entregue', 'À coletar', 'Coletado');

-- AlterTable
ALTER TABLE "public"."fornecedores" ADD COLUMN     "tipo" VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."orcamento" ADD COLUMN     "lancado_obra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lancado_obra_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."pedido_compra" (
    "id" SERIAL NOT NULL,
    "obra_id" INTEGER NOT NULL,
    "orcamento_telha" DECIMAL(10,2) NOT NULL,
    "previsao_telha" DATE NOT NULL,
    "status_telha" "public"."PedidoStatusPadrao" NOT NULL,
    "area_telha" DECIMAL(10,2) NOT NULL,
    "orcamento_madeira" DECIMAL(10,2) NOT NULL,
    "previsao_madeira" DATE NOT NULL,
    "status_madeira" "public"."PedidoStatusPadrao" NOT NULL,
    "fornecedor_madeira_id" INTEGER NOT NULL,
    "materiais_status" "public"."PedidoStatusMateriais" NOT NULL,
    "andaimes_status" "public"."PedidoStatusAndaimes" NOT NULL,
    "andaimes_fornecedor_id" INTEGER NOT NULL,
    "pedido_telha_id" INTEGER NOT NULL,
    "pedido_madeira_id" INTEGER NOT NULL,
    "pedido_materiais_id" INTEGER NOT NULL,
    "pedido_andaimes_id" INTEGER NOT NULL,

    CONSTRAINT "pedido_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ordem_servico" (
    "id" SERIAL NOT NULL,
    "equipe_id" INTEGER NOT NULL,
    "data_prev_inicio" DATE NOT NULL,
    "data_prev_conclusao" DATE NOT NULL,
    "obra_id" INTEGER NOT NULL,

    CONSTRAINT "ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipes" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pedido_telha" (
    "id" SERIAL NOT NULL,
    "pedido_compra_id" INTEGER NOT NULL,
    "descricao" VARCHAR(150) NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pedido_telha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pedido_madeira" (
    "id" SERIAL NOT NULL,
    "pedido_compra_id" INTEGER NOT NULL,
    "componente" VARCHAR(100) NOT NULL,
    "madeira_nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(150) NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "tamanho" DECIMAL(10,2) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pedido_madeira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pedido_materiais" (
    "id" SERIAL NOT NULL,
    "pedido_compra_id" INTEGER NOT NULL,
    "descricao" VARCHAR(150) NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pedido_materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pedido_andaimes" (
    "id" SERIAL NOT NULL,
    "pedido_compra_id" INTEGER NOT NULL,
    "descricao" VARCHAR(150) NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pedido_andaimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."obras" (
    "id" SERIAL NOT NULL,
    "orcamento_id" INTEGER,
    "cliente_id" INTEGER NOT NULL,
    "equipe_id" INTEGER,
    "endereco_obra" VARCHAR(255) NOT NULL,
    "maps_url" VARCHAR(255) NOT NULL,
    "tipo_obra" VARCHAR(100) NOT NULL,
    "largura" DECIMAL(10,2) NOT NULL,
    "comprimento" DECIMAL(10,2) NOT NULL,
    "telha_escolhida" VARCHAR(120) NOT NULL,
    "valor_obra" DECIMAL(10,2) NOT NULL,
    "valor_mao_de_obra" DECIMAL(10,2) NOT NULL,
    "status" "public"."ObraStatus" NOT NULL DEFAULT 'Assinatura de contrato',
    "observacoes" TEXT,
    "pagamento_entrada" DECIMAL(10,2),
    "forma_pagamento_entrada" VARCHAR(30),
    "status_pagamento_entrada" "public"."PagamentoStatus" NOT NULL DEFAULT 'Pendente',
    "pagamento_quitacao" DECIMAL(10,2),
    "forma_pagamento_quitacao" VARCHAR(30),
    "status_pagamento_quitacao" "public"."PagamentoStatus" NOT NULL DEFAULT 'Pendente',
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "data_criacao" TIMESTAMP(6) DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'::text),
    "data_ultima_alteracao" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'::text),

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."obra_imagens" (
    "id" SERIAL NOT NULL,
    "obra_id" INTEGER NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "ordem" INTEGER,
    "legenda" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obra_imagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedido_compra_obra_id_key" ON "public"."pedido_compra"("obra_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_compra_pedido_telha_id_key" ON "public"."pedido_compra"("pedido_telha_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_compra_pedido_madeira_id_key" ON "public"."pedido_compra"("pedido_madeira_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_compra_pedido_materiais_id_key" ON "public"."pedido_compra"("pedido_materiais_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_compra_pedido_andaimes_id_key" ON "public"."pedido_compra"("pedido_andaimes_id");

-- CreateIndex
CREATE INDEX "pedido_compra_obra_id_idx" ON "public"."pedido_compra"("obra_id");

-- CreateIndex
CREATE INDEX "pedido_compra_fornecedor_madeira_id_idx" ON "public"."pedido_compra"("fornecedor_madeira_id");

-- CreateIndex
CREATE INDEX "pedido_compra_andaimes_fornecedor_id_idx" ON "public"."pedido_compra"("andaimes_fornecedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_obra_id_key" ON "public"."ordem_servico"("obra_id");

-- CreateIndex
CREATE INDEX "ordem_servico_equipe_id_idx" ON "public"."ordem_servico"("equipe_id");

-- CreateIndex
CREATE INDEX "ordem_servico_obra_id_idx" ON "public"."ordem_servico"("obra_id");

-- CreateIndex
CREATE INDEX "pedido_telha_pedido_compra_id_idx" ON "public"."pedido_telha"("pedido_compra_id");

-- CreateIndex
CREATE INDEX "pedido_madeira_pedido_compra_id_idx" ON "public"."pedido_madeira"("pedido_compra_id");

-- CreateIndex
CREATE INDEX "pedido_materiais_pedido_compra_id_idx" ON "public"."pedido_materiais"("pedido_compra_id");

-- CreateIndex
CREATE INDEX "pedido_andaimes_pedido_compra_id_idx" ON "public"."pedido_andaimes"("pedido_compra_id");

-- CreateIndex
CREATE UNIQUE INDEX "obras_orcamento_id_key" ON "public"."obras"("orcamento_id");

-- CreateIndex
CREATE INDEX "obras_cliente_id_idx" ON "public"."obras"("cliente_id");

-- CreateIndex
CREATE INDEX "obras_equipe_id_idx" ON "public"."obras"("equipe_id");

-- CreateIndex
CREATE INDEX "obras_created_by_idx" ON "public"."obras"("created_by");

-- CreateIndex
CREATE INDEX "obras_updated_by_idx" ON "public"."obras"("updated_by");

-- CreateIndex
CREATE INDEX "obra_imagens_obra_id_idx" ON "public"."obra_imagens"("obra_id");

-- CreateIndex
CREATE INDEX "fornecedores_tipo_idx" ON "public"."fornecedores"("tipo");

-- CreateIndex
CREATE INDEX "idx_orcamento_lancado_obra" ON "public"."orcamento"("lancado_obra");

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_fornecedor_madeira_id_fkey" FOREIGN KEY ("fornecedor_madeira_id") REFERENCES "public"."fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_andaimes_fornecedor_id_fkey" FOREIGN KEY ("andaimes_fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_telha_id_fkey" FOREIGN KEY ("pedido_telha_id") REFERENCES "public"."pedido_telha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_madeira_id_fkey" FOREIGN KEY ("pedido_madeira_id") REFERENCES "public"."pedido_madeira"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_materiais_id_fkey" FOREIGN KEY ("pedido_materiais_id") REFERENCES "public"."pedido_materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_andaimes_id_fkey" FOREIGN KEY ("pedido_andaimes_id") REFERENCES "public"."pedido_andaimes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ordem_servico" ADD CONSTRAINT "ordem_servico_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ordem_servico" ADD CONSTRAINT "ordem_servico_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_telha" ADD CONSTRAINT "pedido_telha_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "public"."pedido_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_madeira" ADD CONSTRAINT "pedido_madeira_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "public"."pedido_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_materiais" ADD CONSTRAINT "pedido_materiais_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "public"."pedido_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_andaimes" ADD CONSTRAINT "pedido_andaimes_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "public"."pedido_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."obras" ADD CONSTRAINT "obras_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."obras" ADD CONSTRAINT "obras_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."obras" ADD CONSTRAINT "obras_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."obras" ADD CONSTRAINT "obras_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."obras" ADD CONSTRAINT "obras_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."obra_imagens" ADD CONSTRAINT "obra_imagens_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
