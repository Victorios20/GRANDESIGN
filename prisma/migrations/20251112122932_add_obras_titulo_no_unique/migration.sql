-- AlterTable
ALTER TABLE "obras" ADD COLUMN     "titulo" VARCHAR(150);

-- AlterTable
ALTER TABLE "orcamento" ADD COLUMN     "id_fornecedor" INTEGER;

-- CreateIndex
CREATE INDEX "idx_obras_titulo" ON "obras"("titulo");

-- CreateIndex
CREATE INDEX "idx_orcamento_id_fornecedor" ON "orcamento"("id_fornecedor");

-- AddForeignKey
ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
