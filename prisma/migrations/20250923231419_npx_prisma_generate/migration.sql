-- AlterTable
ALTER TABLE "public"."cliente" ADD COLUMN     "cpf" VARCHAR(11);

-- CreateIndex
CREATE INDEX "idx_cliente_nome" ON "public"."cliente"("nome");
