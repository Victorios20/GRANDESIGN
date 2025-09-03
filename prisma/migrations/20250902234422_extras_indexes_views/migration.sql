-- Extensões (ok em transação)
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA public;

-- Função auxiliar para TRGM (usa a unaccent do schema public)
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.unaccent($1)
$$;

-- Índices "simples" (drift)
CREATE INDEX IF NOT EXISTS "idx_orcamento_data_criacao"
  ON "public"."orcamento"("data_criacao" DESC);

CREATE INDEX IF NOT EXISTS "idx_orc_mat_orcamento_id_id"
  ON "public"."orcamento_material"("orcamento_id", "id");

CREATE INDEX IF NOT EXISTS "idx_orc_pag_orcamento_id_tipo_metodo"
  ON "public"."orcamento_pagamento"("orcamento_id", "tipo_telhas", "metodo_pagamento");

-- Índices de busca
CREATE INDEX IF NOT EXISTS idx_cliente_cidade_id
  ON public.cliente USING btree (cidade_id);

CREATE INDEX IF NOT EXISTS idx_cliente_nome_trgm
  ON public.cliente USING gin (immutable_unaccent(lower(nome)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cliente_bairro_trgm
  ON public.cliente USING gin (immutable_unaccent(lower(bairro)) gin_trgm_ops);


--SE NAO DER CERTO RODAR DIRETO NO BANCO DE DADOS 