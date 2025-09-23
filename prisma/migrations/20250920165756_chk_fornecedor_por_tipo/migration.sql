ALTER TABLE "materiais"
ADD CONSTRAINT "materiais_fornecedor_por_tipo_chk"
CHECK (
  ("tipo" = 'madeira' AND "fornecedorId" IS NOT NULL)
  OR
  ("tipo" IN ('geral','telha') AND "fornecedorId" IS NULL)
) NOT VALID;
