-- [1] Snapshot do maior id atual (para não quebrar duplicados existentes)
DO $$
DECLARE
  v_max_id bigint;
  v_sql text;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO v_max_id FROM public.cliente;

  -- [2] Índice ÚNICO PARCIAL que só vale para registros novos (id > snapshot),
  --     comparando nome apenas case-insensitive (lower)
  v_sql := format($f$
    CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_nome_future
    ON public.cliente ( (lower(nome)) )
    WHERE id > %s;
  $f$, v_max_id);

  EXECUTE v_sql;
END$$;
