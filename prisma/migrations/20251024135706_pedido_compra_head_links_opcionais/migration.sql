-- DropForeignKey
ALTER TABLE "public"."pedido_compra" DROP CONSTRAINT "pedido_compra_andaimes_fornecedor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."pedido_compra" DROP CONSTRAINT "pedido_compra_fornecedor_madeira_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_andaimes_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_madeira_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_materiais_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."pedido_compra" DROP CONSTRAINT "pedido_compra_pedido_telha_id_fkey";

-- AlterTable
ALTER TABLE "public"."pedido_compra" ALTER COLUMN "orcamento_telha" SET DEFAULT 0,
ALTER COLUMN "previsao_telha" DROP NOT NULL,
ALTER COLUMN "status_telha" SET DEFAULT 'Pendente',
ALTER COLUMN "area_telha" SET DEFAULT 0,
ALTER COLUMN "orcamento_madeira" SET DEFAULT 0,
ALTER COLUMN "previsao_madeira" DROP NOT NULL,
ALTER COLUMN "status_madeira" SET DEFAULT 'Pendente',
ALTER COLUMN "fornecedor_madeira_id" DROP NOT NULL,
ALTER COLUMN "materiais_status" SET DEFAULT 'Pendente',
ALTER COLUMN "andaimes_status" SET DEFAULT 'Pendente',
ALTER COLUMN "andaimes_fornecedor_id" DROP NOT NULL,
ALTER COLUMN "pedido_telha_id" DROP NOT NULL,
ALTER COLUMN "pedido_madeira_id" DROP NOT NULL,
ALTER COLUMN "pedido_materiais_id" DROP NOT NULL,
ALTER COLUMN "pedido_andaimes_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_fornecedor_madeira_id_fkey" FOREIGN KEY ("fornecedor_madeira_id") REFERENCES "public"."fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_andaimes_fornecedor_id_fkey" FOREIGN KEY ("andaimes_fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_telha_id_fkey" FOREIGN KEY ("pedido_telha_id") REFERENCES "public"."pedido_telha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_madeira_id_fkey" FOREIGN KEY ("pedido_madeira_id") REFERENCES "public"."pedido_madeira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_materiais_id_fkey" FOREIGN KEY ("pedido_materiais_id") REFERENCES "public"."pedido_materiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pedido_compra" ADD CONSTRAINT "pedido_compra_pedido_andaimes_id_fkey" FOREIGN KEY ("pedido_andaimes_id") REFERENCES "public"."pedido_andaimes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
