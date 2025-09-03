-- 1) Extensões (ok rodar em transação)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Função auxiliar para índices TRGM por expressão
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE;

-- 3) Índices que o drift apontou (mantive seus nomes)
CREATE INDEX IF NOT EXISTS "idx_orcamento_data_criacao"
  ON "public"."orcamento"("data_criacao" DESC);

CREATE INDEX IF NOT EXISTS "idx_orc_mat_orcamento_id_id"
  ON "public"."orcamento_material"("orcamento_id", "id");

CREATE INDEX IF NOT EXISTS "idx_orc_pag_orcamento_id_tipo_metodo"
  ON "public"."orcamento_pagamento"("orcamento_id", "tipo_telhas", "metodo_pagamento");

-- 4) Seus índices de busca (já usados no gd)
CREATE INDEX IF NOT EXISTS idx_cliente_cidade_id
  ON public.cliente USING btree (cidade_id);

CREATE INDEX IF NOT EXISTS idx_cliente_nome_trgm
  ON public.cliente USING gin (immutable_unaccent(lower(nome)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cliente_bairro_trgm
  ON public.cliente USING gin (immutable_unaccent(lower(bairro)) gin_trgm_ops);
