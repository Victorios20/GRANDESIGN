-- CreateTable
CREATE TABLE "public"."cidades" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,

    CONSTRAINT "cidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cliente" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "telefone" VARCHAR(20),
    "bairro" VARCHAR(100),
    "cidade_id" INTEGER,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."componentes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "componentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."frete" (
    "id" SERIAL NOT NULL,
    "bairro" VARCHAR(100) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "frete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."materiais" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "unidade_de_medida" VARCHAR(20) DEFAULT 'un',

    CONSTRAINT "materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orcamento" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "tipo_obra_id" INTEGER,
    "link_slide" VARCHAR(255),
    "data_criacao" TIMESTAMP(6) DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'::text),
    "totais_madeiras_preco" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totais_materiais_preco" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totais_comissao_preco" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totais_empresa_ps_preco" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totais_empresa_gd_preco" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "largura" DECIMAL(10,2),
    "comprimento" DECIMAL(10,2),
    "totais_frete_preco" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "link_pdf" TEXT,
    "titulo" VARCHAR(150),
    "largura_menor" DECIMAL(10,2),
    "largura_maior" DECIMAL(10,2),
    "comprimento_menor" DECIMAL(10,2),
    "comprimento_maior" DECIMAL(10,2),

    CONSTRAINT "orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orcamento_material" (
    "id" SERIAL NOT NULL,
    "orcamento_id" INTEGER NOT NULL,
    "material_id" INTEGER,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT,
    "tamanho" DECIMAL(10,2),
    "componente" TEXT,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "frete" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "orcamento_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orcamento_pagamento" (
    "id" SERIAL NOT NULL,
    "orcamento_id" INTEGER NOT NULL,
    "tipo_telhas" TEXT NOT NULL,
    "metodo_pagamento" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "orcamento_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."receitas_fixas" (
    "id" SERIAL NOT NULL,
    "tipo_obra" VARCHAR(100) NOT NULL,
    "material_id" INTEGER NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "componente" TEXT,

    CONSTRAINT "receitas_fixas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tipo_obra" (
    "id" SERIAL NOT NULL,
    "tipo_obra" TEXT NOT NULL,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cidades_nome_key" ON "public"."cidades"("nome");

-- CreateIndex
CREATE INDEX "idx_cliente_cidade_id" ON "public"."cliente"("cidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "componentes_nome_key" ON "public"."componentes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "materiais_descricao_key" ON "public"."materiais"("descricao");

-- CreateIndex
CREATE UNIQUE INDEX "orcamento_titulo_unique" ON "public"."orcamento"("titulo");

-- CreateIndex
CREATE INDEX "idx_orcamento_pagamento_orcamento_id" ON "public"."orcamento_pagamento"("orcamento_id");

-- AddForeignKey
ALTER TABLE "public"."cliente" ADD CONSTRAINT "cliente_cidade_id_fkey" FOREIGN KEY ("cidade_id") REFERENCES "public"."cidades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."orcamento" ADD CONSTRAINT "orcamento_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."orcamento" ADD CONSTRAINT "orcamento_tipo_obra_id_fkey" FOREIGN KEY ("tipo_obra_id") REFERENCES "public"."tipo_obra"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."orcamento_material" ADD CONSTRAINT "orcamento_material_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamento"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."orcamento_pagamento" ADD CONSTRAINT "orcamento_pagamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamento"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."receitas_fixas" ADD CONSTRAINT "receitas_fixas_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materiais"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
