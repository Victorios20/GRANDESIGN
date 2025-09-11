-- AlterTable
ALTER TABLE "public"."orcamento" ADD COLUMN     "data_ultima_alteracao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "idx_orcamento_data_ultima_alteracao" ON "public"."orcamento"("data_ultima_alteracao" DESC);
