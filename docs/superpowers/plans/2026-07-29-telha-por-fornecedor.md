# Telha por Fornecedor no Orçamento — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telha passa a ter preço por fornecedor em cadastro (fora do código), a tabela interna do orçamento mostra todos os fornecedores de cada telha com toggle "Proposta" pré-marcado no mais barato, e o preço do fornecedor marcado alimenta o total da proposta (decisão "A" do Edson, 29/07/2026).

**Architecture:** Ferramenta INTERNA — a proposta que o cliente recebe não muda de formato (continua sem fornecedor, uma linha por tipo de telha em `orcamento_pagamento` keyed por `tipo_telhas`). A quantidade da telha vem da fórmula por tipo (área × fator + offset) e NÃO muda com fornecedor — só o preço unitário muda. A regra antiga do "maior valor do grupo" para telha é substituída pela escolha explícita via toggle (default: mais barato). Madeira não muda em nada.

**Tech Stack:** Next.js App Router, Prisma 6 (PostgreSQL, migration SQL), TypeScript, testes via scripts `tsx` (padrão `scripts/test-payable-status.ts`).

## Global Constraints

- Um fornecedor por telha na proposta (toggle = troca, não soma).
- Default = mais barato de cada telha (custo = quantidade × preço + frete).
- Telhas legadas sem fornecedor (`fornecedorId NULL`) continuam funcionando — aparecem com fornecedor "—" e participam da seleção normalmente.
- O formato voltado ao cliente (PDF/slide/`orcamento_pagamento`) não muda: continua keyed por nome da telha, com pix/10×/18× calculados como hoje (`Math.ceil(base/100)*100`, `FATOR_10X`, `FATOR_18X`).
- Madeira: comportamento intocado (busca por fornecedor único selecionado, colapsa no escolhido).
- Commits pequenos por task, mensagens em pt-BR (`feat:`, `fix:`, `chore:`).
- Validação Prisma obrigatória em mudanças de schema (AGENTS.md): `npx prisma validate && npx prisma format && npx prisma migrate dev && npx prisma generate`.

---

### Task 1: Migration — telha com fornecedor + colunas de seleção no orçamento

O check constraint `materiais_fornecedor_por_tipo_chk` (migration `20250920165756`) FORÇA telha a `fornecedorId NULL` — é a raiz do bloqueio. E `orcamento_material` não tem onde guardar o fornecedor escolhido nem a marcação da proposta.

**Files:**
- Create: `prisma/migrations/20260729120000_telha_por_fornecedor/migration.sql`
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: colunas `orcamento_material.fornecedor_id Int?` (FK fornecedores, SetNull) e `orcamento_material.proposta Boolean @default(true)`; constraint de `materiais` liberando telha com ou sem fornecedor.

- [ ] **Step 1: Atualizar o schema**

Em `prisma/schema.prisma`, model `orcamento_material`, adicionar após o campo `frete`:

```prisma
  fornecedor_id Int?
  fornecedor    fornecedores? @relation("FornecedorOrcamentoMaterial", fields: [fornecedor_id], references: [id], onDelete: SetNull)
  proposta      Boolean       @default(true)
```

e o índice dentro do model:

```prisma
  @@index([fornecedor_id], map: "idx_orc_mat_fornecedor_id")
```

No model `fornecedores`, adicionar a relação inversa junto às outras:

```prisma
  orcamentoMateriais orcamento_material[] @relation("FornecedorOrcamentoMaterial")
```

- [ ] **Step 2: Escrever a migration SQL**

Criar `prisma/migrations/20260729120000_telha_por_fornecedor/migration.sql`:

```sql
-- Telha passa a poder ter fornecedor (com ou sem, durante a transição).
-- Regra anterior: madeira exige fornecedor; geral/telha exigem NULL.
-- Regra nova: madeira exige fornecedor; telha livre; demais tipos exigem NULL.
ALTER TABLE "materiais" DROP CONSTRAINT IF EXISTS "materiais_fornecedor_por_tipo_chk";
ALTER TABLE "materiais"
ADD CONSTRAINT "materiais_fornecedor_por_tipo_chk"
CHECK (
  ("tipo" = 'madeira' AND "fornecedorId" IS NOT NULL)
  OR ("tipo" = 'telha')
  OR ("tipo" NOT IN ('madeira', 'telha') AND "fornecedorId" IS NULL)
) NOT VALID;

-- Fornecedor escolhido e marcação de proposta por linha do orçamento.
ALTER TABLE "orcamento_material" ADD COLUMN "fornecedor_id" INTEGER;
ALTER TABLE "orcamento_material" ADD COLUMN "proposta" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "orcamento_material"
ADD CONSTRAINT "orcamento_material_fornecedor_id_fkey"
FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_orc_mat_fornecedor_id" ON "orcamento_material"("fornecedor_id");
```

- [ ] **Step 3: Validar e aplicar**

```bash
npx prisma validate && npx prisma format
npx prisma migrate dev
npx prisma generate
npx tsc --noEmit
```

Expected: migration aplicada sem erro; client regenerado; tsc limpo.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260729120000_telha_por_fornecedor/
git commit -m "feat(orcamento): telha pode ter fornecedor; orcamento_material guarda fornecedor e marcação de proposta"
```

---

### Task 2: Lógica pura de seleção (TDD)

O coração da feature: marcar a mais barata por nome, trocar seleção dentro do nome, filtrar as linhas da proposta. Puro, sem IO — vira módulo compartilhado entre UI e persistência.

**Files:**
- Create: `src/lib/orcamento/telha-selection.ts`
- Test: `scripts/test-telha-selection.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `type TelhaSelecionavel = { nome: string; fornecedorId: number | null; fornecedorNome?: string | null; quantidade: number; preco: number; frete?: number | null; proposta?: boolean }`
  - `custoTelha(row): number` — `quantidade * preco + (frete ?? 0)`
  - `marcarMaisBaratas(rows): TelhaSelecionavel[]` — exatamente uma `proposta: true` por nome (a de menor custo; empate: primeira)
  - `selecionarFornecedor(rows, nome, fornecedorId): TelhaSelecionavel[]` — troca a seleção dentro do nome, não mexe nos demais
  - `linhasProposta(rows): TelhaSelecionavel[]` — só as marcadas

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/test-telha-selection.ts`:

```ts
import assert from "node:assert/strict"

import {
    custoTelha,
    linhasProposta,
    marcarMaisBaratas,
    selecionarFornecedor,
} from "../src/lib/orcamento/telha-selection"

const rows = [
    { nome: "Americana", fornecedorId: 1, fornecedorNome: "São Bento", quantidade: 370, preco: 2.1, frete: 100 },
    { nome: "Americana", fornecedorId: 2, fornecedorNome: "Telhas Norte", quantidade: 370, preco: 2.45, frete: 0 },
    { nome: "Colonial", fornecedorId: 1, fornecedorNome: "São Bento", quantidade: 1000, preco: 1.8 },
    { nome: "Maxxi", fornecedorId: null, quantidade: 250, preco: 4.0 },
]

assert.equal(custoTelha(rows[0]), 370 * 2.1 + 100)
assert.equal(custoTelha(rows[2]), 1800)

const marcadas = marcarMaisBaratas(rows)
// Americana: São Bento (877) < Telhas Norte (906.5)
assert.equal(marcadas[0].proposta, true)
assert.equal(marcadas[1].proposta, false)
// Fornecedor único e legado (null) sempre marcados
assert.equal(marcadas[2].proposta, true)
assert.equal(marcadas[3].proposta, true)

// Trocar Americana para Telhas Norte: só o grupo Americana muda
const trocadas = selecionarFornecedor(marcadas, "Americana", 2)
assert.equal(trocadas[0].proposta, false)
assert.equal(trocadas[1].proposta, true)
assert.equal(trocadas[2].proposta, true)

// Proposta: exatamente uma linha por nome
const proposta = linhasProposta(trocadas)
assert.deepEqual(proposta.map((r) => [r.nome, r.fornecedorId]), [
    ["Americana", 2],
    ["Colonial", 1],
    ["Maxxi", null],
])

// Empate de custo: primeira vence
const empate = marcarMaisBaratas([
    { nome: "Romana", fornecedorId: 1, quantidade: 10, preco: 5 },
    { nome: "Romana", fornecedorId: 2, quantidade: 10, preco: 5 },
])
assert.equal(empate[0].proposta, true)
assert.equal(empate[1].proposta, false)

console.log("telha selection rules: ok")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx tsx scripts/test-telha-selection.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `src/lib/orcamento/telha-selection.ts`:

```ts
/**
 * Seleção de fornecedor por telha na tabela interna do orçamento.
 * Regra de negócio (Edson, 29/07/2026): todos os fornecedores visíveis,
 * default no mais barato, UM fornecedor por telha na proposta (troca, não soma).
 * O preço do fornecedor marcado alimenta o total da proposta (decisão "A").
 */
export type TelhaSelecionavel = {
    nome: string
    fornecedorId: number | null
    fornecedorNome?: string | null
    quantidade: number
    preco: number
    frete?: number | null
    proposta?: boolean
}

export function custoTelha(row: Pick<TelhaSelecionavel, "quantidade" | "preco" | "frete">): number {
    return row.quantidade * row.preco + (row.frete ?? 0)
}

export function marcarMaisBaratas<T extends TelhaSelecionavel>(rows: T[]): T[] {
    const cheapestIndexByName = new Map<string, number>()

    rows.forEach((row, index) => {
        const nome = row.nome.trim()
        if (!nome) return
        const currentIndex = cheapestIndexByName.get(nome)
        if (currentIndex === undefined || custoTelha(row) < custoTelha(rows[currentIndex])) {
            cheapestIndexByName.set(nome, index)
        }
    })

    return rows.map((row, index) => ({
        ...row,
        proposta: cheapestIndexByName.get(row.nome.trim()) === index,
    }))
}

export function selecionarFornecedor<T extends TelhaSelecionavel>(
    rows: T[],
    nome: string,
    fornecedorId: number | null,
): T[] {
    const alvo = nome.trim()
    return rows.map((row) =>
        row.nome.trim() === alvo
            ? { ...row, proposta: (row.fornecedorId ?? null) === fornecedorId }
            : row,
    )
}

export function linhasProposta<T extends TelhaSelecionavel>(rows: T[]): T[] {
    return rows.filter((row) => row.proposta !== false)
}
```

- [ ] **Step 4: Rodar e ver passar; encadear**

Run: `npx tsx scripts/test-telha-selection.ts`
Expected: `telha selection rules: ok`

Em `package.json`: adicionar `"test:telha-selection": "tsx scripts/test-telha-selection.ts"` e incluir na cadeia do `"test"`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/orcamento/telha-selection.ts scripts/test-telha-selection.ts package.json
git commit -m "feat(orcamento): regras puras de seleção de fornecedor por telha (default mais barato)"
```

---

### Task 3: Busca de preços retorna telhas de todos os fornecedores

`getMateriaisByDescricoesServer` só encontra telha com `fornecedorId: null` ([calcularMateriais-db.server.ts:40](../../../src/actions/calcular-materiais/calcularMateriais-db.server.ts)). Telha cadastrada sob fornecedor fica invisível → preço zero.

**Files:**
- Modify: `src/actions/calcular-materiais/calcularMateriais-db.server.ts`
- Modify: `src/actions/calcular-materiais/calcularMateriais-db.ts` (tipo `MaterialRow`)

**Interfaces:**
- Produces: `MaterialRow` ganha `fornecedorNome: string | null`; a busca devolve N linhas por descrição de telha (uma por fornecedor, incluindo a legada com `fornecedorId null`).

- [ ] **Step 1: Ampliar o OR da busca e o select**

Em `src/actions/calcular-materiais/calcularMateriais-db.server.ts`, função `getMateriaisByDescricoesServer`, trocar o bloco `OR` do `where`:

```ts
      OR: [
        { AND: [{ tipo: "madeira" }, { fornecedorId }] },
        { tipo: "telha" },
        { AND: [{ NOT: { tipo: { in: ["madeira", "telha"] } } }, { fornecedorId: null }] },
      ],
```

e no `select`, adicionar:

```ts
      fornecedor: { select: { nome: true } },
```

No mapeamento de retorno (`rows.map(r => ({ ... }))`), incluir:

```ts
    fornecedorNome: r.fornecedor?.nome ?? null,
```

- [ ] **Step 2: Tipo compartilhado**

Localizar a definição de `MaterialRow` (busca: `grep -rn "MaterialRow" src/actions/calcular-materiais/*.ts`) e adicionar o campo:

```ts
    fornecedorNome?: string | null
```

- [ ] **Step 3: Checar o modo strict**

Run: `grep -n "strict" src/actions/calcular-materiais/calcularMateriais-db.server.ts`

Se o modo `strict` valida "toda descrição pedida foi encontrada", garantir que a checagem é por DESCRIÇÃO ÚNICA (um `Set` das descrições retornadas), não por contagem de linhas — múltiplas linhas por telha não podem disparar erro. Ajustar se necessário:

```ts
    const found = new Set(result.map((r) => r.descricao))
    const missing = list.filter((d) => !found.has(d))
```

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit`
Expected: limpo (o campo é opcional — chamadas existentes seguem compilando).

- [ ] **Step 5: Commit**

```bash
git add src/actions/calcular-materiais/calcularMateriais-db.server.ts src/actions/calcular-materiais/calcularMateriais-db.ts
git commit -m "feat(orcamento): busca de preços enxerga telha de qualquer fornecedor"
```

---

### Task 4: Cálculo de materiais gera uma linha de telha por fornecedor

Hoje `telhasAgrup.map(toCalc)` casa preço por descrição num `Map` — com N fornecedores por descrição, um sobrescreve o outro. Telhas passam a expandir por fornecedor; madeira e materiais gerais intocados.

**Files:**
- Modify: `src/actions/calcular-materiais/calcularMateriais.ts`

**Interfaces:**
- Produces: `MaterialCalculado` ganha `fornecedorId?: number | null` e `fornecedorNome?: string | null`; `Resultado.telhas` traz uma linha por (descrição × fornecedor).

- [ ] **Step 1: Ampliar o tipo**

Localizar `MaterialCalculado` (busca: `grep -n "MaterialCalculado" src/actions/calcular-materiais/calcularMateriais.ts | head -3`) e adicionar os campos opcionais:

```ts
  fornecedorId?: number | null
  fornecedorNome?: string | null
```

- [ ] **Step 2: Expandir telhas por fornecedor (obra normal)**

Em `calcularMateriaisNormal`, após a construção de `mapaPrecos` e `toCalc`, substituir `telhas: telhasAgrup.map(toCalc)` no retorno. Antes do `return`, adicionar:

```ts
  const telhaPrecoRows = precos.filter((row) => (row.tipo ?? "").toLowerCase() === "telha")

  const telhasPorFornecedor = telhasAgrup.flatMap((r) => {
    const ofertas = telhaPrecoRows.filter((p) => p.descricao === r.descricao)
    if (ofertas.length === 0) {
      // sem cadastro: mantém a linha com preço zero, como hoje
      return [{ ...toCalc(r), fornecedorId: null, fornecedorNome: null }]
    }
    return ofertas.map((p) => ({
      descricao: r.descricao,
      componente: r.componente,
      quantidade: r.quantidade,
      preco_unitario: Number(p.preco_unitario) || 0,
      fornecedorId: p.fornecedorId ?? null,
      fornecedorNome: p.fornecedorNome ?? null,
    }))
  })
```

e no `return`:

```ts
    telhas: telhasPorFornecedor,
```

- [ ] **Step 3: Mesmo tratamento na variante em L**

Aplicar o mesmo bloco na função da coberta em L (busca: `telhas: telhasAgrup.map(toCalcL)` — usar `precosL` e `toCalcL` nos nomes correspondentes).

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit`
Expected: limpo. Nota: `mapaPrecos` continua correto para madeira/materiais — descrições de telha não colidem com as demais, e telhas não usam mais o mapa.

- [ ] **Step 5: Commit**

```bash
git add src/actions/calcular-materiais/calcularMateriais.ts
git commit -m "feat(orcamento): cálculo devolve uma linha de telha por fornecedor"
```

---

### Task 5: Tabela de telhas com coluna Fornecedor e toggle "Proposta"

A tabela "Telhas – valores fixos" ([OrcamentoPage.tsx, Card com `telhaTipos.map`]) vira a tabela aprovada pelo Edson: coluna de toggle + Tipo + Fornecedor + Pix/10×/18× por linha. A regra do "Maior Valor" (destaque amarelo + rodapé "valor maior de cada grupo") é REMOVIDA para telha — substituída pela seleção explícita. `calcTelhaValores` passa a considerar só as linhas marcadas.

**Files:**
- Modify: `src/app/orcamento/_components/OrcamentoPage.tsx`

**Interfaces:**
- Consumes: `marcarMaisBaratas`, `selecionarFornecedor`, `custoTelha` de `@/lib/orcamento/telha-selection`.
- Produces: linhas de `materiais.telhas` no estado carregam `fornecedorId`/`fornecedorNome`/`proposta`; `telhaValores` (keyed por nome) reflete apenas a linha marcada.

- [ ] **Step 1: Tipos e imports**

1. Import no topo:

```ts
import { custoTelha, marcarMaisBaratas, selecionarFornecedor } from "@/lib/orcamento/telha-selection"
```

2. No tipo `Material` do arquivo (busca: `type Categoria = "madeiras" | "materiaisGerais" | "telhas"` e o tipo de item próximo), adicionar campos opcionais ao item:

```ts
    fornecedorId?: number | null
    fornecedorNome?: string | null
    proposta?: boolean
```

- [ ] **Step 2: Marcar as mais baratas ao calcular**

No handler de cálculo (busca: `telhasNew = aplicarFreteTelhasPorCidade(telhasNew, cidades, form.cidade)`), logo após essa linha:

```ts
            telhasNew = marcarMaisBaratas(
                telhasNew.map((t: any) => ({ ...t, nome: t.nome, preco: t.preco }))
            ) as typeof telhasNew
```

(o `mapRow` que constrói `telhasNew` deve preservar `fornecedorId`/`fornecedorNome` vindos do cálculo — conferir e incluir os campos no objeto retornado pelo `mapRow` para a categoria telhas.)

- [ ] **Step 3: `calcTelhaValores` considera só linhas marcadas**

Na função `calcTelhaValores` (topo do arquivo), o loop que soma `extra` por nome ganha o filtro e passa a usar apenas a linha da proposta:

```ts
    for (const t of telhasArr) {
        if (t.proposta === false) continue
        const nome = (t.nome ?? "").trim()
        if (!nome) continue
        const extra = (t.quantidade * t.preco) + (t.frete ?? 0)
        grupos.set(nome, (grupos.get(nome) ?? 0) + extra)
    }
```

Exportar também o cálculo unitário para uso na tabela (mesmo arquivo, junto de `calcTelhaValores`):

```ts
const makePagto = (totalGeral: number, extra: number): Pagto => {
    const base = totalGeral + extra
    const pix = Math.ceil(base / 100) * 100
    return {
        pix,
        x10: Math.ceil((pix * FATOR_10X) / 10),
        x18: Math.ceil((pix * FATOR_18X) / 18),
    }
}
```

e trocar o `make` interno de `calcTelhaValores` por `makePagto(totalGeral, extra)`.

- [ ] **Step 4: Reescrever a tabela**

Substituir o conteúdo do `<Table>` do Card "Telhas – valores fixos" (busca: `Telhas – valores fixos`) — cabeçalho e corpo — por linha-por-fornecedor:

```tsx
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-bege">
                                        <TableHead className="w-16">Proposta</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Fornecedor</TableHead>
                                        <TableHead className="text-right">Pix</TableHead>
                                        <TableHead className="text-right">10×</TableHead>
                                        <TableHead className="text-right">18×</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materiais.telhas.map((t, index) => {
                                        const selecionada = t.proposta !== false
                                        const v = makePagto(somaTotal, custoTelha({ quantidade: t.quantidade, preco: t.preco, frete: t.frete ?? 0 }))
                                        const primeiraDoTipo =
                                            index === 0 || materiais.telhas[index - 1].nome.trim() !== t.nome.trim()
                                        const group = getTileGroup(t.nome)

                                        return (
                                            <TableRow
                                                key={`${t.nome}-${t.fornecedorId ?? "s/f"}`}
                                                className={selecionada ? "bg-green-50/60" : "opacity-60"}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selecionada}
                                                        onCheckedChange={() =>
                                                            setMateriais((m) => ({
                                                                ...m,
                                                                telhas: selecionarFornecedor(m.telhas as any, t.nome, t.fornecedorId ?? null) as any,
                                                            }))
                                                        }
                                                        aria-label={`Usar ${t.fornecedorNome ?? "sem fornecedor"} para ${t.nome}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="flex items-center gap-2">
                                                    {group && primeiraDoTipo && (
                                                        <div className={`w-3 h-3 rounded-full ${GROUP_CONFIG[group].color}`} title={`Grupo: ${group}`} />
                                                    )}
                                                    <span className={primeiraDoTipo ? "font-medium" : "text-muted-foreground text-xs"}>{t.nome}</span>
                                                </TableCell>
                                                <TableCell>{t.fornecedorNome ?? "—"}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.pix)}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.x10)}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.x18)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
```

e trocar o rodapé (busca: `* A proposta ira com o valor maior`):

```tsx
                            <p className="mt-2 text-xs text-marromEscuro/60">
                                * A proposta vai com o fornecedor marcado de cada telha (pré-marcado o mais barato).
                            </p>
```

Remover a lógica `isMostExpensive`/badge "Maior Valor" que ficou órfã. `Checkbox` — conferir import existente no arquivo; adicionar `import { Checkbox } from "@/components/ui/checkbox"` se ausente. IMPORTANTE: ordenar `materiais.telhas` por nome antes de renderizar (para o agrupamento visual de `primeiraDoTipo` funcionar) — se a ordem do estado não for garantida, criar `const telhasOrdenadas = [...materiais.telhas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))` e mapear sobre ela.

- [ ] **Step 5: Recalcular telhaValores quando a seleção muda**

O `useEffect` existente (busca: `setTelhaValores(calcTelhaValores(materiais.telhas, somaTotal))`) já depende de `materiais.telhas` — a troca de seleção via `setMateriais` dispara o recálculo automaticamente. Verificar que a dependência do effect inclui `materiais.telhas` e não apenas `somaTotal`.

- [ ] **Step 6: Validar**

Run: `npx tsc --noEmit`
Expected: limpo. Manual (dev): novo orçamento → calcular → tabela mostra telhas × fornecedores, mais barata marcada; clicar em outra linha troca a seleção do grupo e os valores da proposta (etapa de pagamento) refletem a linha marcada; telha de fornecedor único aparece marcada.

- [ ] **Step 7: Commit**

```bash
git add src/app/orcamento/_components/OrcamentoPage.tsx
git commit -m "feat(orcamento): tabela de telhas por fornecedor com toggle de proposta (default mais barato)"
```

---

### Task 6: Persistir fornecedor e seleção; hidratar na edição

O save grava telhas via INSERT cru em `orcamento_material` sem fornecedor ([salvar-orcamento-db.ts, `insertMaterial` tipo "telha"]); a edição hidrata sem os campos novos. Sem isso, reabrir o orçamento perde a escolha.

**Files:**
- Modify: `src/actions/salvar-orcamento-db/salvar-orcamento-db.ts`
- Modify: `src/actions/edit-orcamento-db/edit-orcamento-db.ts`

**Interfaces:**
- Consumes: colunas `fornecedor_id`/`proposta` (Task 1); linhas de telha do cliente com `fornecedorId`/`proposta` (Task 5).
- Produces: `initialData.materiais.telhas` hidratado com `fornecedorId`/`fornecedorNome`/`proposta` no modo edição.

- [ ] **Step 1: Estender o insert**

Em `salvar-orcamento-db.ts`:

1. Localizar `insertMaterial` (busca: `INSERT INTO orcamento_material`) e adicionar as colunas ao SQL e ao tipo do parâmetro:

```ts
    INSERT INTO orcamento_material
      (orcamento_id, tipo, descricao, componente, quantidade, preco_unitario, tamanho, frete, total, fornecedor_id, proposta)
    VALUES
      (${row.orcamento_id}, ${row.tipo}, ${row.descricao}, ${row.componente}, ${row.quantidade}, ${row.preco_unitario}, ${row.tamanho}, ${row.frete}, ${row.total}, ${row.fornecedor_id ?? null}, ${row.proposta ?? true})
```

com `fornecedor_id?: number | null` e `proposta?: boolean` no tipo do parâmetro (default preservando comportamento antigo para madeira/materiais, que não enviam os campos).

2. No loop das telhas (busca: `for (const m of mats.telhas ?? [])`), repassar os campos:

```ts
            fornecedor_id: (m as any).fornecedorId ?? null,
            proposta: (m as any).proposta !== false,
```

3. No tipo de entrada dos materiais do save (busca: `telhas: { nome: string; quantidade: number; preco: number; frete?` ), adicionar:

```ts
        telhas: { nome: string; quantidade: number; preco: number; frete?: number | null; fornecedorId?: number | null; fornecedorNome?: string | null; proposta?: boolean }[]
```

- [ ] **Step 2: Espelhar no edit**

Em `edit-orcamento-db.ts`:

1. Onde as telhas são lidas para hidratar (busca: `tipo_telhas` e o select de `orcamento_material`), incluir `fornecedor_id`, `proposta` e o nome do fornecedor (join/`include` `fornecedor: { select: { nome: true } }` se for Prisma; coluna extra se for SQL cru) e mapear para o shape do cliente:

```ts
                fornecedorId: m.fornecedor_id ?? null,
                fornecedorNome: m.fornecedor?.nome ?? null,
                proposta: m.proposta !== false,
```

2. No caminho de gravação da edição (o upsert/delete-insert das linhas de material), aplicar as mesmas colunas do Step 1.

- [ ] **Step 3: Validar**

Run: `npx tsc --noEmit`
Expected: limpo. Manual: salvar orçamento com Americana/Telhas Norte selecionada → reabrir para edição → a seleção volta como estava; salvar de novo sem tocar → nada muda no banco além do esperado.

- [ ] **Step 4: Commit**

```bash
git add src/actions/salvar-orcamento-db/salvar-orcamento-db.ts src/actions/edit-orcamento-db/edit-orcamento-db.ts
git commit -m "feat(orcamento): persiste fornecedor e seleção de proposta das telhas"
```

---

### Task 7: Obra usa o fornecedor da telha escolhida; cadastro ganha telha por fornecedor

Fechamento do ciclo: (a) ao lançar a obra, o pedido de telha herda o fornecedor da linha marcada no orçamento (hoje `fornecedor_telha_id` é input manual); (b) o cadastro (`/cadastros`) permite criar telha vinculada a fornecedor — o catálogo sai do código na prática, porque os preços passam a ser mantidos ali.

**Files:**
- Modify: `src/actions/obras/create-obra-db.ts`
- Modify: `src/app/cadastros/page.tsx`
- Modify: `src/app/api/materiais/route.ts` (ou rota equivalente de criação — confirmar no Step 3)

**Interfaces:**
- Consumes: `orcamento_material.fornecedor_id`/`proposta` (Task 6).

- [ ] **Step 1: Pedido de telha herda o fornecedor marcado**

Em `src/actions/obras/create-obra-db.ts`:

1. No select do orçamento usado na criação (busca: `orcamento_material` dentro do `include`/`select` do orçamento), garantir que `fornecedor_id` e `proposta` vêm junto.

2. Na busca do `telhaBudgetItem` (busca: `telhaBudgetItem = orc.orcamento_material?.find`), priorizar a linha marcada:

```ts
      if (telhaEscolhidaNorm) {
        const candidatas = orc.orcamento_material.filter((m) => {
          const d = normalizeStr(m.descricao || "")
          return d.includes(telhaEscolhidaNorm) || telhaEscolhidaNorm.includes(d)
        })
        telhaBudgetItem = candidatas.find((m) => (m as any).proposta !== false) ?? candidatas[0]
      }
```

3. No `gruposAutomated` (busca: `categoria: PedidoCategoria.TELHA`), o fornecedor cai em cascata — input manual vence, senão a linha marcada:

```ts
        { categoria: PedidoCategoria.TELHA, itens: telhaItems, fornecedor: input.fornecedor_telha_id ?? (telhaBudgetItem as any)?.fornecedor_id ?? null },
```

- [ ] **Step 2: Cadastro de telha com fornecedor**

Em `src/app/cadastros/page.tsx`:

1. No modal de criação com `modalType === "telha"` (busca: `case "telha"` / onde o form do material é montado), adicionar o mesmo select de fornecedor usado no fluxo de madeira (busca: como o modal `"madeira"` popula `fornecedorId`), opcional (telha sem fornecedor continua válida):

```tsx
    {(modalType === "madeira" || modalType === "telha") && (
        /* select de fornecedor existente do fluxo madeira, agora compartilhado;
           para telha, permitir vazio ("Sem fornecedor") */
    )}
```

2. Na listagem da categoria `"telhas"` (busca: `case "telhas":`), exibir o nome do fornecedor ao lado da descrição quando houver (`fornecedores.find(f => f.id === m.fornecedorId)?.nome`).

- [ ] **Step 3: API de criação aceita fornecedor para telha**

Run: `grep -rn "tipo.*telha\|fornecedorId" src/app/api/materiais/route.ts src/app/api/materiais/*/route.ts* 2>/dev/null | head`

Se a rota de criação/edição de materiais valida "telha não pode ter fornecedor" (espelho do check constraint antigo), remover essa recusa e passar `fornecedorId` adiante quando `tipo === "telha"`. Se não houver validação (constraint era só no banco), nenhum código a mudar — registrar isso no commit message.

- [ ] **Step 4: Validar fim-a-fim**

Run: `npm test && npx tsc --noEmit`
Expected: limpos. Manual: cadastrar "Americana marfim resinada" sob um segundo fornecedor com preço diferente → novo orçamento mostra as duas linhas → marcar a mais cara → salvar → lançar obra → o pedido de telha nasce com o fornecedor marcado (e, com o plano do financeiro aplicado, a conta a pagar correspondente).

- [ ] **Step 5: Commit**

```bash
git add src/actions/obras/create-obra-db.ts src/app/cadastros/page.tsx src/app/api/materiais/
git commit -m "feat(orcamento): obra herda fornecedor da telha marcada; cadastro de telha por fornecedor"
```

---

## Verificação final do plano

- [ ] `npm test` verde (inclui `test:telha-selection`)
- [ ] `npx tsc --noEmit` e `npm run lint` limpos
- [ ] `npx prisma validate` limpo; migration aplicada em dev
- [ ] Roteiro manual: cadastro → cálculo → seleção → proposta → salvar → editar → obra
- [ ] Regressão madeira: orçamento só-madeira calcula e salva idêntico ao comportamento atual

## Fora de escopo (registrado para não esquecer)

- Migrar as fórmulas de quantidade (`telhaDescricoesPorTipoBase` + factors em `calcularMateriais.ts`) para cadastro — os PREÇOS saem do código com este plano; as fórmulas ficam para uma fase 2 se o Edson pedir tipos novos de telha.
- Backfill de fornecedor nas telhas legadas (ficam como "—" até serem recadastradas).
