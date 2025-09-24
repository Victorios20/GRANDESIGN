-- garanta que as extensões existem (se já existem, fica no-op)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Telefone (só dígitos)
CREATE INDEX IF NOT EXISTS idx_cliente_tel_digits_trgm
ON public.cliente
USING gin ((regexp_replace(coalesce(telefone,''), '\D', '', 'g')) gin_trgm_ops);

-- Nome (unaccent/lower)
CREATE INDEX IF NOT EXISTS idx_cliente_nome_unaccent_trgm
ON public.cliente
USING gin (immutable_unaccent(lower(nome)) gin_trgm_ops);
