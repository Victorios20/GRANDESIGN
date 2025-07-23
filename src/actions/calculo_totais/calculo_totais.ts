/* ────────────────────────────────────────────────────────────────
   GRANDESIGN · actions/calculo_totais/calculo_totais.ts
   Calcula automaticamente:
     • Mão de Obra
     • Empresa GD
   Regras (herdadas do script legado e confirmadas pelo cliente):
     • Se o tipo de obra for QUALQUER um dos casos abaixo,
       aumenta 1 dia de equipe (diasEquipe = 2):
         - "Coluna 15"
         - "Coluna 11,5"  (ou "11.5")
         - "Linha na Parede + Coluna 15"
         - "Linha na Parede + Coluna 11,5" (ou "11.5")
     • Caso contrário, diasEquipe = 1.
     • Fórmulas:
         mãoDeObra = baseMaoDeObra + diasEquipe × custoDiaEquipe
         empresaGD = custoEmpresaGD   (fixo)
───────────────────────────────────────────────────────────────── */

export interface TotaisCalculados {
  maoDeObra: number
  empresaGD: number
}

export interface ParametrosTotais {
  /** Tipo de obra (ex.: "Coluna 15", "Linha na Parede + Coluna 11,5", etc.) */
  tipoObra: string
  /** Sobrescrever valores-padrão (opcional) */
  custoEmpresaGD?: number   // default = 2000
  baseMaoDeObra?: number    // default = 1500
  custoDiaEquipe?: number   // default = 500
}

/** Função principal – retorna { maoDeObra, empresaGD } */
export function calcularTotais({
  tipoObra,
  custoEmpresaGD = 2000,
  baseMaoDeObra  = 1500,
  custoDiaEquipe = 500,
}: ParametrosTotais): TotaisCalculados {

  const isObraComColuna = testaSeObraTemColuna(tipoObra)
  const diasEquipe      = isObraComColuna ? 2 : 1

  const maoDeObra = baseMaoDeObra + diasEquipe * custoDiaEquipe
  const empresaGD = custoEmpresaGD

  return { maoDeObra, empresaGD }
}

/* -------- helpers -------- */

/**
 * Normaliza a string (minúsculas, pontos por vírgulas removidos)
 * e verifica se está em um dos quatro casos que exigem 2 dias.
 */
function testaSeObraTemColuna(tipo: string): boolean {
  const t = tipo
    .toLowerCase()
    .replace('.', ',')         // trata "11.5" = "11,5"
    .replace(/\s+/g, ' ')      // colapsa espaços múltiplos

  return (
    t === "coluna 15" ||
    t === "coluna 11,5" ||
    t === "linha na parede + coluna 15" ||
    t === "linha na parede + coluna 11,5"
  )
}
