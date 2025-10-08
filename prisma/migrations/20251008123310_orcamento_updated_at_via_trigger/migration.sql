CREATE OR REPLACE FUNCTION set_data_ultima_alteracao_sp()
RETURNS trigger AS $$
BEGIN
  NEW.data_ultima_alteracao := (now() AT TIME ZONE 'America/Sao_Paulo');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orcamento_set_updated_at ON orcamento;

CREATE TRIGGER trg_orcamento_set_updated_at
BEFORE UPDATE ON orcamento
FOR EACH ROW
EXECUTE FUNCTION set_data_ultima_alteracao_sp();
