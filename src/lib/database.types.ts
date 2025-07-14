/* ────────────────────────────────────────────────────────────
   src/lib/database.types.ts
   Tipagem gerada manualmente a partir dos comandos CREATE TABLE
   que você forneceu.  Só contém as colunas (Row) — sem Insert/Update.
──────────────────────────────────────────────────────────── */

/** Colunas da tabela public.cliente */
export interface ClienteRow {
  id: number
  nome: string
  telefone: string | null
  bairro: string | null
  cidade: string | null
}

/** Enum de tipos aceitos em public.materiais.tipo */
export type MaterialTipo = "madeira" | "geral" | "telha"

/** Colunas da tabela public.materiais */
export interface MateriaisRow {
  id: number
  descricao: string
  tipo: MaterialTipo
  preco_unitario: number         // numeric(10,2) → number
  unidade_de_medida: string | null
}

/** Colunas da tabela public.frete */
export interface FreteRow {
  id: number
  bairro: string
  preco: number                  // numeric(10,2)
}

/** Colunas da tabela public.produto */
export interface ProdutoRow {
  id: number
  tipo_obra: string
}

/** Colunas da tabela public.orcamento */
export interface OrcamentoRow {
  id: number
  cliente_id: number
  produto_id: number
  frete_id: number
  link_slide: string | null
  data_criacao: string           // timestamp → ISO string
  totais_madeiras_preco: number
  totais_materiais_preco: number
  totais_mao_de_obra_preco: number
  totais_empresa_ps_preco: number
  totais_empresa_gd_preco: number
}

/** Colunas da tabela public.orcamento_material */
export interface OrcamentoMaterialRow {
  id: number
  orcamento_id: number
  material_id: number
  quantidade: number
  preco_unitario: number
  nome_tabela: string | null
}

/** Colunas da tabela public.produto_receita */
export interface ProdutoReceitaRow {
  id: number
  produto_id: number
  material_id: number
  quantidade: number
  preco_unitario: number
}

/** Colunas da tabela public.receitas_fixas */
export interface ReceitasFixasRow {
  id: number
  tipo_obra: string
  material_id: number
  quantidade: number
}

/** Colunas da tabela public.tipos_obra */
export interface TiposObraRow {
  id: number
  nome: string
  slug: string
  descricao: string | null
}

/* -----------------------------------------------------------
   Objeto Database para o Supabase JS v2 (apenas Rows)
----------------------------------------------------------- */
export type Database = {
  public: {
    Tables: {
      cliente: { Row: ClienteRow }
      materiais: { Row: MateriaisRow }
      frete: { Row: FreteRow }
      produto: { Row: ProdutoRow }
      orcamento: { Row: OrcamentoRow }
      orcamento_material: { Row: OrcamentoMaterialRow }
      produto_receita: { Row: ProdutoReceitaRow }
      receitas_fixas: { Row: ReceitasFixasRow }
      tipos_obra: { Row: TiposObraRow }
    }
  }
}
