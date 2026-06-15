// src/app/orcamento/_utils/fatoresCartao.ts

// fatores de acréscimo do cartão
export const FATOR_10X = 1.11; // arredondando para 11,00 %
export const FATOR_18X = 1.2385; // 23,85 %

/**
 * Resolve o fator de acréscimo do cartão a partir da forma de pagamento.
 * Retorna 1 (sem acréscimo) para Pix/1x ou parcelas sem fator definido.
 */
export function fatorCartao(forma: string | null | undefined): number {
  const normalized = String(forma ?? "").trim().toLowerCase();
  if (normalized === "10x") return FATOR_10X;
  if (normalized === "18x") return FATOR_18X;
  return 1;
}
