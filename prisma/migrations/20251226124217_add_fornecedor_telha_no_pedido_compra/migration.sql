-- AlterTable
ALTER TABLE "pedido_compra" ADD COLUMN     "fornecedor_telha_id" INTEGER;

-- CreateIndex
CREATE INDEX "pedido_compra_fornecedor_telha_id_idx" ON "pedido_compra"("fornecedor_telha_id");

-- AddForeignKey
ALTER TABLE "pedido_compra" ADD CONSTRAINT "pedido_compra_fornecedor_telha_id_fkey" FOREIGN KEY ("fornecedor_telha_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
