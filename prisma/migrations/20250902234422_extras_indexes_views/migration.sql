-- ===== Extensões =====
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA public;

-- ===== Função auxiliar =====
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.unaccent($1)
$$;

-- ===== Índices: criam só se não existir nenhum equivalente =====

-- orcamento(data_criacao)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='orcamento'
      AND indexdef ILIKE '%(data_criacao%' -- cobre com ou sem aspas
  ) THEN
    CREATE INDEX idx_orcamento_data_criacao
      ON public.orcamento ("data_criacao" DESC);
  END IF;
END $$;

-- orcamento_material(orcamento_id, id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='orcamento_material'
      AND indexdef ILIKE '%(orcamento_id, id)%'
  ) THEN
    CREATE INDEX idx_orc_mat_orcamento_id_id
      ON public.orcamento_material (orcamento_id, id);
  END IF;
END $$;

-- orcamento_pagamento(orcamento_id, tipo_telhas, metodo_pagamento)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='orcamento_pagamento'
      AND indexdef ILIKE '%(orcamento_id, tipo_telhas, metodo_pagamento)%'
  ) THEN
    CREATE INDEX idx_orc_pag_orcamento_id_tipo_metodo
      ON public.orcamento_pagamento (orcamento_id, tipo_telhas, metodo_pagamento);
  END IF;
END $$;

-- cliente(cidade_id) btree
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='cliente'
      AND indexdef ILIKE '%USING btree (cidade_id)%'
  ) THEN
    CREATE INDEX idx_cliente_cidade_id
      ON public.cliente USING btree (cidade_id);
  END IF;
END $$;

-- cliente(nome) TRGM com unaccent/lower
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='cliente'
      AND indexdef ILIKE '%immutable_unaccent(lower(nome)) gin_trgm_ops%'
  ) THEN
    CREATE INDEX idx_cliente_nome_trgm
      ON public.cliente USING gin (immutable_unaccent(lower(nome)) gin_trgm_ops);
  END IF;
END $$;

-- cliente(bairro) TRGM com unaccent/lower
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='cliente'
      AND indexdef ILIKE '%immutable_unaccent(lower(bairro)) gin_trgm_ops%'
  ) THEN
    CREATE INDEX idx_cliente_bairro_trgm
      ON public.cliente USING gin (immutable_unaccent(lower(bairro)) gin_trgm_ops);
  END IF;
END $$;
