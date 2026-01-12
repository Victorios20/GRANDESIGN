/*
  Warnings:

  - You are about to drop the column `andaimes_fornecedor_id` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `andaimes_status` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `area_telha` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `fornecedor_madeira_id` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `fornecedor_telha_id` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `materiais_status` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `orcamento_madeira` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `orcamento_telha` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `pedido_andaimes_id` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `pedido_madeira_id` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `pedido_materiais_id` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `pedido_telha_id` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `previsao_madeira` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `previsao_telha` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `status_madeira` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the column `status_telha` on the `pedido_compra` table. All the data in the column will be lost.
  - You are about to drop the `pedido_andaimes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pedido_madeira` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pedido_materiais` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pedido_telha` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoria` to the `pedido_compra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pedido_compra` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PedidoCategoria" AS ENUM ('TELHA', 'MADEIRA', 'MATERIAIS', 'ANDAIMES');

-- CreateEnum
CREATE TYPE "PedidoCompraStatus" AS ENUM ('Rascunho', 'Pendente', 'Aprovado', 'Em compra', 'Aguardando pagamento', 'Aguardando entrega', 'Entregue', 'Cancelado');

-- DropForeignKey
ALTER TABLE "pedido_andaimes" DROP CONSTRAINT "pedido_andaimes_pedido_compra_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_compra" DROP CONSTRAINT "pedido_compra_andaimes_fornecedor_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_compra" DROP CONSTRAINT "pedido_compra_fornecedor_madeira_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_compra" DROP CONSTRAINT "pedido_compra_fornecedor_telha_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_andaimes_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_madeira_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_materiais_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_telha_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_madeira" DROP CONSTRAINT "pedido_madeira_pedido_compra_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_materiais" DROP CONSTRAINT "pedido_materiais_pedido_compra_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_telha" DROP CONSTRAINT "pedido_telha_pedido_compra_id_fkey";

-- DropIndex
DROP INDEX "pedido_compra_andaimes_fornecedor_id_idx";

-- DropIndex
DROP INDEX "pedido_compra_fornecedor_madeira_id_idx";

-- DropIndex
DROP INDEX "pedido_compra_fornecedor_telha_id_idx";

-- DropIndex
DROP INDEX "pedido_compra_obra_id_key";

-- DropIndex
DROP INDEX "pedido_compra_pedido_andaimes_id_key";

-- DropIndex
DROP INDEX "pedido_compra_pedido_madeira_id_key";

-- DropIndex
DROP INDEX "pedido_compra_pedido_materiais_id_key";

-- DropIndex
DROP INDEX "pedido_compra_pedido_telha_id_key";

-- AlterTable
ALTER TABLE "pedido_compra" DROP COLUMN "andaimes_fornecedor_id",
DROP COLUMN "andaimes_status",
DROP COLUMN "area_telha",
DROP COLUMN "fornecedor_madeira_id",
DROP COLUMN "fornecedor_telha_id",
DROP COLUMN "materiais_status",
DROP COLUMN "orcamento_madeira",
DROP COLUMN "orcamento_telha",
DROP COLUMN "pedido_andaimes_id",
DROP COLUMN "pedido_madeira_id",
DROP COLUMN "pedido_materiais_id",
DROP COLUMN "pedido_telha_id",
DROP COLUMN "previsao_madeira",
DROP COLUMN "previsao_telha",
DROP COLUMN "status_madeira",
DROP COLUMN "status_telha",
ADD COLUMN     "categoria" "PedidoCategoria" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "data_entrega" DATE,
ADD COLUMN     "descricao" VARCHAR(500),
ADD COLUMN     "endereco_entrega" VARCHAR(500),
ADD COLUMN     "fornecedor_id" INTEGER,
ADD COLUMN     "frete" DECIMAL(10,2),
ADD COLUMN     "link_maps" VARCHAR(500),
ADD COLUMN     "nome_receptor" VARCHAR(150),
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "status" "PedidoCompraStatus" NOT NULL DEFAULT 'Rascunho',
ADD COLUMN     "telefone_receptor" VARCHAR(20),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "valor_orcado" DECIMAL(10,2),
ADD COLUMN     "valor_realizado" DECIMAL(10,2);

-- DropTable
DROP TABLE "pedido_andaimes";

-- DropTable
DROP TABLE "pedido_madeira";

-- DropTable
DROP TABLE "pedido_materiais";

-- DropTable
DROP TABLE "pedido_telha";

-- CreateTable
CREATE TABLE "pedido_itens" (
    "id" SERIAL NOT NULL,
    "pedido_compra_id" INTEGER NOT NULL,
    "descricao" VARCHAR(150) NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "tamanho" DECIMAL(10,2),
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pedido_itens_pedido_compra_id" ON "pedido_itens"("pedido_compra_id");

-- CreateIndex
CREATE INDEX "idx_pedido_compra_fornecedor_id" ON "pedido_compra"("fornecedor_id");

-- CreateIndex
CREATE INDEX "idx_pedido_compra_obra_categoria" ON "pedido_compra"("obra_id", "categoria");

-- AddForeignKey
ALTER TABLE "pedido_compra" ADD CONSTRAINT "pedido_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "pedido_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "pedido_compra_obra_id_idx" RENAME TO "idx_pedido_compra_obra_id";
