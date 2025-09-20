/*
  Warnings:

  - A unique constraint covering the columns `[descricao,fornecedorId]` on the table `materiais` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."materiais_descricao_key";

-- AlterTable
ALTER TABLE "public"."materiais" ADD COLUMN     "fornecedorId" INTEGER;

-- CreateTable
CREATE TABLE "public"."fornecedores" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_nome_key" ON "public"."fornecedores"("nome");

-- CreateIndex
CREATE INDEX "materiais_tipo_idx" ON "public"."materiais"("tipo");

-- CreateIndex
CREATE INDEX "materiais_fornecedorId_idx" ON "public"."materiais"("fornecedorId");

-- CreateIndex
CREATE UNIQUE INDEX "ux_materiais_desc_fornecedor" ON "public"."materiais"("descricao", "fornecedorId");

-- AddForeignKey
ALTER TABLE "public"."materiais" ADD CONSTRAINT "materiais_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "public"."fornecedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
