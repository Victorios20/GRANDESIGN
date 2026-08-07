-- Telha passa a poder ter fornecedor (com ou sem, durante a transição).
-- Regra anterior: madeira exige fornecedor; geral/telha exigem NULL.
-- Regra nova: madeira exige fornecedor; telha livre; demais tipos exigem NULL.
ALTER TABLE "materiais" DROP CONSTRAINT IF EXISTS "materiais_fornecedor_por_tipo_chk";
ALTER TABLE "materiais"
ADD CONSTRAINT "materiais_fornecedor_por_tipo_chk"
CHECK (
  ("tipo" = 'madeira' AND "fornecedorId" IS NOT NULL)
  OR ("tipo" = 'telha')
  OR ("tipo" NOT IN ('madeira', 'telha') AND "fornecedorId" IS NULL)
) NOT VALID;

-- Fornecedor escolhido e marcação de proposta por linha do orçamento.
ALTER TABLE "orcamento_material" ADD COLUMN "fornecedor_id" INTEGER;
ALTER TABLE "orcamento_material" ADD COLUMN "proposta" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "orcamento_material"
ADD CONSTRAINT "orcamento_material_fornecedor_id_fkey"
FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_orc_mat_fornecedor_id" ON "orcamento_material"("fornecedor_id");
