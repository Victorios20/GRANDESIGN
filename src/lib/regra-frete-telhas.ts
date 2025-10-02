// src/utils/regra-frete-telhas.ts
import type { Material } from "@/app/orcamento/_components/OrcamentoPage";
import type { Cidade } from "@/actions/cidades-db/cidades-db";

const CIDADES_ESPECIAIS = new Set<number>([11, 6]); // Pacajus=11, Horizonte=6
const FRETE_ESPECIAL = 200;

const ehTelhaElegivel = (nome: string) => {
  const s = (nome ?? "").toLowerCase();
  return s.includes("romana") || s.includes("americana") || s.includes("maxxi");
};

// remove acentos, normaliza espaços e minúsculas
const norm = (s?: string | null) =>
  (s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function isCidadeComFreteEspecial(cidadeId?: number | null) {
  return cidadeId != null && CIDADES_ESPECIAIS.has(cidadeId);
}

/**
 * Aplica a regra:
 * - Se cidade ∈ {Pacajus, Horizonte} ⇒ frete=200 nas telhas elegíveis
 * - Caso contrário ⇒ frete=0 nas telhas elegíveis
 * Observação: roda em eventos de "troca de cidade" e logo após o cálculo inicial.
 */
export function aplicarFreteTelhasPorCidade(
  telhas: Material[],
  cidades: Cidade[],
  cidadeSelecionadaNome?: string | null,
): Material[] {
  const nomeNorm = norm(cidadeSelecionadaNome);

  // tenta achar por nome NORMALIZADO; se falhar, tenta se o campo for um ID em string
  let cidadeId: number | undefined;
  const byName = cidades.find((c) => norm(c.nome) === nomeNorm);
  if (byName) {
    cidadeId = byName.id;
  } else {
    const asNum = Number((cidadeSelecionadaNome ?? "").trim());
    if (Number.isFinite(asNum) && asNum > 0) {
      cidadeId = cidades.find((c) => c.id === asNum)?.id;
    }
  }

  const especial = isCidadeComFreteEspecial(cidadeId);

  return telhas.map((t) => {
    if (!ehTelhaElegivel(t.nome)) return t;
    const novoFrete = especial ? FRETE_ESPECIAL : 0;
    return { ...t, frete: novoFrete };
  });
}
