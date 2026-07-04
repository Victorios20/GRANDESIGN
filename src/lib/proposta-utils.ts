export type PropostaCustos = {
  maoObra: number
  materiais: number
  frete: number
  lucro: number
}

export function calcularValorFinalProposta(c: PropostaCustos): number {
  const total = c.maoObra + c.materiais + c.frete + c.lucro
  return Number(total.toFixed(2))
}

export function formatPropostaNumero(id: number): string {
  return String(id).padStart(4, "0")
}
