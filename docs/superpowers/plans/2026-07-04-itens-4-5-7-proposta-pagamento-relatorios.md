# Itens 4, 5 e 7 — Proposta de Serviço, Automação Pagamento→Pedido, Revisão de Relatórios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar (4) uma tela dedicada de Proposta de Serviço com PDF próprio da marca, (5) a automação que avança o pedido de compra para "Aguardando Entrega" ao pagar + um dialog que pergunta se quer quitar reduzindo o valor ou deixar saldo em aberto, e (7) a correção dos relatórios financeiros que hoje contam transferências em dobro.

**Architecture:** Next.js 15 (App Router) + Prisma + Supabase (Postgres). Regras de negócio puras são extraídas para módulos sem dependência de Prisma (`src/lib/*`) para permitir testes unitários rápidos com Vitest. Server actions (`"use server"`) validam com zod e persistem via Prisma. O PDF é gerado server-side com `@react-pdf/renderer` (sem headless browser). UI reaproveita componentes shadcn/ui existentes (`Dialog`, `AlertDialog`, `SearchableSelect`, `Card`).

**Tech Stack:** Next.js 15.3.3, React 18, TypeScript, Prisma, Postgres/Supabase, zod, Vitest (novo), @react-pdf/renderer (novo), Tailwind, shadcn/ui, sonner (toasts).

## Global Constraints

- Node 22, Next 15.3.3, React 18 — não alterar versões.
- Todos os valores monetários no banco são `Decimal`; converter para `number` na borda com `Number(...)` (padrão já usado no projeto).
- Server actions começam com a diretiva `"use server"` na primeira linha do arquivo.
- Datas "date-only" usam `zDateOnly` de `@/lib/date-only` e `getTodayDateOnly()`; não usar `new Date()` cru para datas de competência.
- Módulos de regra pura em `src/lib/*` NÃO podem importar `@/lib/prisma` (para os testes rodarem sem DB/cliente gerado).
- Enum de status do pedido: `PedidoCompraStatus` de `@prisma/client` com valores `RASCUNHO, PENDENTE, APROVADO, EM_COMPRA, AGUARDANDO_PAGAMENTO, AGUARDANDO_ENTREGA, ENTREGUE, CANCELADO`.
- Enum de status financeiro: `StatusFinanceiro` de `@prisma/client` com valores `PENDENTE, PAGO, PARCIAL, ATRASADO, CANCELADO`.
- Dados fixos da marca no PDF: CNPJ `59.769.971/0001-43`, WhatsApp `(85) 9 9411-5576`.
- Paleta do PDF (do modelo de referência): faixa/verde-oliva `#3F3D1E`, card creme `#FDF3E3`, dourado `#E0B64F`, preço verde `#2E7D32`, texto escuro `#2C201B`.
- Commits frequentes, um por task, mensagens em pt-BR no padrão `feat:` / `fix:` / `test:` / `chore:`, terminando com a linha de co-autoria exigida pelo repositório.

---

## File Structure

**Test infra (compartilhado)**
- Create: `vitest.config.ts` — configuração do Vitest com resolução do alias `@/`.
- Modify: `package.json` — script `"test"` + devDeps (`vitest`, `vite-tsconfig-paths`).

**Parte A — Item 7 (Relatórios)**
- Create: `src/lib/balancete-tree.ts` — função pura que monta a árvore hierárquica do balancete a partir de categorias + linhas agregadas.
- Create: `src/lib/balancete-tree.test.ts` — testes unitários da função pura.
- Modify: `src/actions/financeiro/reports/get-balancete.ts` — usar a função pura + excluir transferências no SQL.
- Modify: `src/services/financial/orcado-realizado.service.ts` — excluir transferências na receita realizada.

**Parte B — Item 5 (Pagamento → Pedido + Dialog)**
- Create: `src/lib/payment-rules.ts` — helpers puros: resultado do pagamento (quitar vs parcial) e decisão de avanço de status do pedido.
- Create: `src/lib/payment-rules.test.ts` — testes unitários.
- Modify: `src/actions/financeiro/payables/pay.ts` — flag `quitarSaldo`, cálculo via helper, avanço de status do pedido pós-commit.
- Modify: `src/app/api/financeiro/payables/pay/route.ts` — (nenhuma mudança de código necessária além de reexport; schema já é importado — confirmar).
- Modify: `src/app/contas-pagar/_components/PaymentModal.tsx` — AlertDialog de saldo pendente.

**Parte C — Item 4 (Proposta de Serviço + PDF)**
- Modify: `prisma/schema.prisma` — models `proposta_servico`, `proposta_servico_item`, enum `PropostaStatus`.
- Create: migration (gerada por `prisma migrate dev`).
- Create: `src/lib/proposta-utils.ts` — cálculo puro do valor final + formatação do número da proposta.
- Create: `src/lib/proposta-utils.test.ts` — testes unitários.
- Create: `src/actions/proposta-servico/index.ts` — server actions (salvar/atualizar/get/list/excluir).
- Create: `src/app/proposta-servico/page.tsx` — listagem (server) + `_components/PropostaListClient.tsx`.
- Create: `src/app/proposta-servico/new/page.tsx` e `src/app/proposta-servico/edit/[id]/page.tsx` — usam `_components/PropostaForm.tsx`.
- Create: `src/app/proposta-servico/detalhes/[id]/page.tsx` — detalhes + botão Gerar PDF.
- Create: `src/lib/pdf/PropostaServicoPDF.tsx` — template react-pdf.
- Create: `src/lib/pdf/PropostaServicoPDF.test.ts` — smoke test de render.
- Create: `src/app/api/proposta-servico/[id]/pdf/route.ts` — rota GET que retorna o PDF.
- Modify: `src/components/ui/sidebar-navigation.ts` — link "Proposta de Serviço".
- Create: `public/images/proposta-capa.jpg` — imagem de capa (asset da marca; ver Task C6).

---

## Task 0: Configurar Vitest (test infra compartilhada)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/__smoke__.test.ts` (temporário, removido no fim da task)

**Interfaces:**
- Produces: script `npm run test`; alias `@/` resolvível dentro dos testes; ambiente `node`.

- [ ] **Step 1: Instalar dependências de teste**

```bash
npm install -D vitest@^2 vite-tsconfig-paths@^5
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
  },
})
```

- [ ] **Step 3: Adicionar script de teste ao `package.json`**

No bloco `"scripts"`, adicionar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Criar um smoke test temporário**

`src/lib/__smoke__.test.ts`:

```ts
import { expect, test } from "vitest"

test("vitest resolve alias e roda", () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test`
Expected: PASS (1 test passed). Se o alias `@/` falhar em tasks futuras, confirmar que `tsconfig.json` tem `"paths": { "@/*": ["./src/*"] }`.

- [ ] **Step 6: Remover o smoke test e commitar**

```bash
rm src/lib/__smoke__.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: adiciona Vitest para testes unitários

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PARTE A — Item 7: Revisão dos relatórios financeiros

Bug confirmado: o Balancete soma transferências entre contas em dobro (origem + destino) porque, ao contrário do DRE (`get-operational-result.ts`, que filtra `transferencia_id IS NULL`), o SQL do balancete não exclui transferências. Além disso, a "receita realizada" do Orçado x Realizado não exclui transferências. Estornos já se auto-resolvem (o estorno de conta a pagar deleta o lançamento; o estorno de integração de pedido cria par +/− que zera), então NÃO adicionaremos filtro de status/cancelado — apenas o filtro de transferência, alinhando os três relatórios.

## Task 1 (A1): Extrair a montagem da árvore do balancete para função pura + testes

**Files:**
- Create: `src/lib/balancete-tree.ts`
- Create: `src/lib/balancete-tree.test.ts`
- Modify: `src/actions/financeiro/reports/get-balancete.ts:82-183`

**Interfaces:**
- Produces:
  - `type BalanceteCategory = { id: number; nome: string; tipo: string; categoria_pai_id: number | null }`
  - `type BalanceteRawRow = { categoria_id: number; saldo_anterior: unknown; creditos: unknown; debitos: unknown }`
  - `function buildBalanceteTree(categories: BalanceteCategory[], rawData: BalanceteRawRow[], showEmpty: boolean): BalanceteItem[]`
- Consumes: `BalanceteItem` de `@/types/financeiro`.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/balancete-tree.test.ts`:

```ts
import { expect, test } from "vitest"
import { buildBalanceteTree, type BalanceteCategory, type BalanceteRawRow } from "@/lib/balancete-tree"

const categories: BalanceteCategory[] = [
  { id: 1, nome: "Receitas", tipo: "RECEITA", categoria_pai_id: null },
  { id: 2, nome: "Vendas", tipo: "RECEITA", categoria_pai_id: 1 },
  { id: 3, nome: "Despesas", tipo: "DESPESA", categoria_pai_id: null },
]

test("soma valores dos filhos no pai e calcula saldo_final", () => {
  const raw: BalanceteRawRow[] = [
    { categoria_id: 2, saldo_anterior: 100, creditos: 50, debitos: 0 },
  ]
  const tree = buildBalanceteTree(categories, raw, false)
  const receitas = tree.find((n) => n.categoria_id === 1)!
  expect(receitas.creditos).toBe(50)
  expect(receitas.saldo_anterior).toBe(100)
  expect(receitas.saldo_final).toBe(150)
  expect(receitas.subcontas).toHaveLength(1)
})

test("oculta nós zerados quando showEmpty=false", () => {
  const tree = buildBalanceteTree(categories, [], false)
  expect(tree).toHaveLength(0)
})

test("mostra nós zerados quando showEmpty=true", () => {
  const tree = buildBalanceteTree(categories, [], true)
  expect(tree.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test src/lib/balancete-tree.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/balancete-tree'".

- [ ] **Step 3: Criar `src/lib/balancete-tree.ts`** (mover a lógica dos passos 4-5 do arquivo atual, sem alterar comportamento)

```ts
import type { BalanceteItem } from "@/types/financeiro"

export type BalanceteCategory = {
  id: number
  nome: string
  tipo: string
  categoria_pai_id: number | null
}

export type BalanceteRawRow = {
  categoria_id: number
  saldo_anterior: unknown
  creditos: unknown
  debitos: unknown
}

const toNum = (val: unknown) => Number(val ?? 0)

export function buildBalanceteTree(
  categories: BalanceteCategory[],
  rawData: BalanceteRawRow[],
  showEmpty: boolean,
): BalanceteItem[] {
  const categoryMap = new Map<number, BalanceteItem>()

  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      categoria_id: cat.id,
      nome: cat.nome,
      tipo: cat.tipo === "RECEITA" ? "Receita" : "Despesa",
      nivel: cat.categoria_pai_id ? 2 : 1,
      saldo_anterior: 0,
      creditos: 0,
      debitos: 0,
      saldo_final: 0,
      subcontas: [],
    })
  })

  rawData.forEach((row) => {
    const item = categoryMap.get(row.categoria_id)
    if (item) {
      item.saldo_anterior = toNum(row.saldo_anterior)
      item.creditos = toNum(row.creditos)
      item.debitos = toNum(row.debitos)
      item.saldo_final = item.saldo_anterior + item.creditos - item.debitos
    }
  })

  const roots: BalanceteItem[] = []
  const childrenMap = new Map<number, BalanceteItem[]>()

  categories.forEach((cat) => {
    const item = categoryMap.get(cat.id)!
    if (cat.categoria_pai_id) {
      if (!childrenMap.has(cat.categoria_pai_id)) childrenMap.set(cat.categoria_pai_id, [])
      childrenMap.get(cat.categoria_pai_id)?.push(item)
    } else {
      roots.push(item)
    }
  })

  const processNode = (node: BalanceteItem): boolean => {
    const children = childrenMap.get(node.categoria_id) || []
    let computedSaldoAnt = node.saldo_anterior
    let computedCreditos = node.creditos
    let computedDebitos = node.debitos
    const activeChildren: BalanceteItem[] = []

    for (const child of children) {
      const hasData = processNode(child)
      computedSaldoAnt += child.saldo_anterior
      computedCreditos += child.creditos
      computedDebitos += child.debitos
      if (showEmpty || hasData) activeChildren.push(child)
    }

    node.saldo_anterior = computedSaldoAnt
    node.creditos = computedCreditos
    node.debitos = computedDebitos
    node.saldo_final = computedSaldoAnt + computedCreditos - computedDebitos
    node.subcontas = activeChildren

    return (
      Math.abs(node.saldo_anterior) > 0.001 ||
      Math.abs(node.creditos) > 0.001 ||
      Math.abs(node.debitos) > 0.001
    )
  }

  return roots.filter((root) => {
    const hasData = processNode(root)
    return showEmpty || hasData
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test src/lib/balancete-tree.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refatorar `get-balancete.ts` para usar a função pura**

Substituir tudo de `// 4. Map results...` (linha ~82) até o final da função pelo uso da nova função. O arquivo passa a terminar assim (mantendo os passos 1-3 intactos):

```ts
    const rawData = await prisma.$queryRawUnsafe<RawAggregation[]>(sql, ...queryParams)

    return buildBalanceteTree(
        categories.map((c) => ({
            id: c.id,
            nome: c.nome,
            tipo: c.tipo,
            categoria_pai_id: c.categoria_pai_id,
        })),
        rawData,
        Boolean(show_empty),
    )
}
```

E adicionar o import no topo:

```ts
import { buildBalanceteTree } from "@/lib/balancete-tree"
```

Remover o tipo local `interface RawAggregation` só se não for mais usado — ele ainda é usado como tipo do `$queryRawUnsafe`, então **mantê-lo**.

- [ ] **Step 6: Verificar compilação e testes**

Run: `npx tsc --noEmit && npm run test src/lib/balancete-tree.test.ts`
Expected: sem erros de tipo; testes PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/balancete-tree.ts src/lib/balancete-tree.test.ts src/actions/financeiro/reports/get-balancete.ts
git commit -m "refactor: extrai montagem da árvore do balancete para função pura testável

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 2 (A2): Excluir transferências no Balancete e na receita realizada

**Files:**
- Modify: `src/actions/financeiro/reports/get-balancete.ts` (whereClause do SQL)
- Modify: `src/services/financial/orcado-realizado.service.ts:76-81`

**Interfaces:**
- Consumes: nada novo.
- Produces: nenhuma mudança de assinatura pública.

- [ ] **Step 1: Adicionar filtro de transferência ao SQL do balancete**

Em `get-balancete.ts`, a base do `whereClause` (linha ~42) muda de:

```ts
    let whereClause = `WHERE 1=1`
```

para:

```ts
    // Excluir transferências entre contas (contadas em origem+destino) — alinhado ao DRE (get-operational-result)
    let whereClause = `WHERE transferencia_id IS NULL`
```

- [ ] **Step 2: Adicionar filtro de transferência à receita realizada do Orçado x Realizado**

Em `orcado-realizado.service.ts`, o `aggregate` (linhas ~76-81) muda de:

```ts
        const receitaRealizada = ccIds.length > 0
            ? Number((await prisma.lancamento.aggregate({
                where: { centro_custo_id: { in: ccIds }, tipo: "RECEITA" },
                _sum: { valor: true },
            }))._sum.valor || 0)
            : 0
```

para:

```ts
        const receitaRealizada = ccIds.length > 0
            ? Number((await prisma.lancamento.aggregate({
                where: { centro_custo_id: { in: ccIds }, tipo: "RECEITA", transferencia_id: null },
                _sum: { valor: true },
            }))._sum.valor || 0)
            : 0
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Verificação manual (reconciliação)**

Run: `npm run dev`
1. Criar uma transferência entre duas contas bancárias (tela de Transações/Lançamentos).
2. Abrir Relatórios → Balancete no período: confirmar que a transferência não aparece inflando créditos/débitos.
3. Comparar o total do Balancete com o DRE (Resultado Operacional) no mesmo período — devem bater.

- [ ] **Step 5: Commit**

```bash
git add src/actions/financeiro/reports/get-balancete.ts src/services/financial/orcado-realizado.service.ts
git commit -m "fix: exclui transferências do balancete e da receita realizada (evita contagem dupla)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PARTE B — Item 5: Automação pagamento→pedido + dialog de quitação

Ao pagar uma conta a pagar vinculada a um pedido de compra, o card do pedido deve avançar para `AGUARDANDO_ENTREGA` já no primeiro pagamento (`PAGO` ou `PARCIAL`). Ao pagar um valor menor que o saldo, um AlertDialog pergunta: **Quitar** (reduz `valor_total` para o valor pago → `PAGO`) ou **Deixar saldo em aberto** (`PARCIAL`, comportamento atual).

## Task 3 (B1): Helpers puros de pagamento + testes

**Files:**
- Create: `src/lib/payment-rules.ts`
- Create: `src/lib/payment-rules.test.ts`

**Interfaces:**
- Produces:
  - `function resolvePaymentOutcome(args: { total: number; paid: number; amortized: number; quitarSaldo: boolean }): { newValorTotal: number | null; isPaid: boolean }` — `newValorTotal` é `null` quando o total não muda; `isPaid` indica se a conta ficará `PAGO`.
  - `const PEDIDO_PRE_ENTREGA_STATUSES: readonly string[]` — statuses a partir dos quais o pedido pode avançar para AGUARDANDO_ENTREGA.
  - `function shouldAdvancePedidoToAwaitingDelivery(currentPedidoStatus: string, newContaStatus: string): boolean`

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/payment-rules.test.ts`:

```ts
import { expect, test } from "vitest"
import { resolvePaymentOutcome, shouldAdvancePedidoToAwaitingDelivery } from "@/lib/payment-rules"

test("pagamento integral: PAGO, sem alterar total", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 0, amortized: 1000, quitarSaldo: false })
  expect(r.isPaid).toBe(true)
  expect(r.newValorTotal).toBeNull()
})

test("pagamento parcial sem quitar: PARCIAL, sem alterar total", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 0, amortized: 700, quitarSaldo: false })
  expect(r.isPaid).toBe(false)
  expect(r.newValorTotal).toBeNull()
})

test("pagamento parcial com quitarSaldo: reduz total para o valor pago e vira PAGO", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 0, amortized: 700, quitarSaldo: true })
  expect(r.isPaid).toBe(true)
  expect(r.newValorTotal).toBe(700)
})

test("quitarSaldo considera pagamentos anteriores", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 200, amortized: 300, quitarSaldo: true })
  expect(r.isPaid).toBe(true)
  expect(r.newValorTotal).toBe(500)
})

test("avança pedido em fase pré-entrega quando conta vira PARCIAL", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("AGUARDANDO_PAGAMENTO", "PARCIAL")).toBe(true)
})

test("avança pedido quando conta vira PAGO", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("EM_COMPRA", "PAGO")).toBe(true)
})

test("não regride pedido já em AGUARDANDO_ENTREGA", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("AGUARDANDO_ENTREGA", "PAGO")).toBe(false)
})

test("não mexe em pedido ENTREGUE ou CANCELADO", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("ENTREGUE", "PAGO")).toBe(false)
  expect(shouldAdvancePedidoToAwaitingDelivery("CANCELADO", "PAGO")).toBe(false)
})

test("não avança quando conta não foi paga (ex: PENDENTE)", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("AGUARDANDO_PAGAMENTO", "PENDENTE")).toBe(false)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test src/lib/payment-rules.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Criar `src/lib/payment-rules.ts`**

```ts
export function resolvePaymentOutcome(args: {
  total: number
  paid: number
  amortized: number
  quitarSaldo: boolean
}): { newValorTotal: number | null; isPaid: boolean } {
  const { total, paid, amortized, quitarSaldo } = args
  const newPaid = paid + amortized
  const wouldLeaveBalance = total - newPaid > 0.01

  if (quitarSaldo && wouldLeaveBalance) {
    // Reduz o total para o quanto foi efetivamente pago → conta fica quitada.
    return { newValorTotal: Number(newPaid.toFixed(2)), isPaid: true }
  }

  const isPaid = Math.abs(total - newPaid) < 0.01
  return { newValorTotal: null, isPaid }
}

// A partir destes statuses o pedido pode avançar para AGUARDANDO_ENTREGA.
export const PEDIDO_PRE_ENTREGA_STATUSES = [
  "PENDENTE",
  "APROVADO",
  "EM_COMPRA",
  "AGUARDANDO_PAGAMENTO",
] as const

const CONTA_PAGA_STATUSES = ["PAGO", "PARCIAL"]

export function shouldAdvancePedidoToAwaitingDelivery(
  currentPedidoStatus: string,
  newContaStatus: string,
): boolean {
  if (!CONTA_PAGA_STATUSES.includes(newContaStatus)) return false
  return (PEDIDO_PRE_ENTREGA_STATUSES as readonly string[]).includes(currentPedidoStatus)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test src/lib/payment-rules.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment-rules.ts src/lib/payment-rules.test.ts
git commit -m "feat: helpers puros de resultado de pagamento e avanço de status do pedido

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 4 (B2): Integrar `quitarSaldo` e avanço de status no `pay.ts`

**Files:**
- Modify: `src/actions/financeiro/payables/pay.ts`

**Interfaces:**
- Consumes: `resolvePaymentOutcome`, `shouldAdvancePedidoToAwaitingDelivery` de `@/lib/payment-rules`; `atualizarStatusPedidoCompra` de `@/actions/pedido_compra/update-pedido-compra-status-db`.
- Produces: `payBillSchema` ganha `quitarSaldo: z.boolean().optional().default(false)`. `PayBillInput` inalterado em nome.

- [ ] **Step 1: Adicionar imports no topo do `pay.ts`**

Após os imports existentes, adicionar:

```ts
import { atualizarStatusPedidoCompra } from "@/actions/pedido_compra/update-pedido-compra-status-db"
import { resolvePaymentOutcome, shouldAdvancePedidoToAwaitingDelivery } from "@/lib/payment-rules"
```

- [ ] **Step 2: Adicionar `quitarSaldo` ao schema**

No `payBillSchema` (após `idempotencyKey`):

```ts
    idempotencyKey: z.string().optional(),
    quitarSaldo: z.boolean().optional().default(false),
})
```

- [ ] **Step 3: Usar `resolvePaymentOutcome` dentro da transação**

Substituir o bloco atual (linhas ~83-93):

```ts
            const newPaid = paid + amortized
            const isPaid = Math.abs(total - newPaid) < 0.01
            const newStatus = isPaid ? StatusFinanceiro.PAGO : StatusFinanceiro.PARCIAL

            const updatedBill = await tx.contaPagar.update({
                where: { id: bill.id },
                data: {
                    status: newStatus,
                    data_pagamento: isPaid ? input.data_pagamento : undefined,
                },
            })
```

por:

```ts
            const outcome = resolvePaymentOutcome({
                total,
                paid,
                amortized,
                quitarSaldo: input.quitarSaldo,
            })
            const newStatus = outcome.isPaid ? StatusFinanceiro.PAGO : StatusFinanceiro.PARCIAL

            const updatedBill = await tx.contaPagar.update({
                where: { id: bill.id },
                data: {
                    status: newStatus,
                    // Quitação com redução: total passa a ser o quanto foi pago.
                    valor_total: outcome.newValorTotal ?? undefined,
                    data_pagamento: outcome.isPaid ? input.data_pagamento : undefined,
                },
            })
```

- [ ] **Step 4: Avançar o status do pedido após o commit**

Substituir o bloco atual (linhas ~139-141):

```ts
        if (result.pedido_compra_id) {
            await syncPedidoCompraValorRealizado(result.pedido_compra_id)
        }
```

por:

```ts
        if (result.pedido_compra_id) {
            await syncPedidoCompraValorRealizado(result.pedido_compra_id)

            const pedido = await prisma.pedido_compra.findUnique({
                where: { id: result.pedido_compra_id },
                select: { status: true },
            })
            if (
                pedido &&
                shouldAdvancePedidoToAwaitingDelivery(pedido.status, result.status)
            ) {
                await atualizarStatusPedidoCompra(
                    result.pedido_compra_id,
                    "AGUARDANDO_ENTREGA",
                    userId,
                )
            }
        }
```

- [ ] **Step 5: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros. (Confirmar que `result.status` é do tipo `StatusFinanceiro`; `shouldAdvancePedidoToAwaitingDelivery` aceita `string`, então `result.status` compila.)

- [ ] **Step 6: Confirmar a rota `pay/route.ts`**

Ler `src/app/api/financeiro/payables/pay/route.ts` — ele já faz `payBillSchema.parse(body)`, então `quitarSaldo` já é aceito automaticamente. Nenhuma mudança necessária.

- [ ] **Step 7: Commit**

```bash
git add src/actions/financeiro/payables/pay.ts
git commit -m "feat: pagamento quita conta reduzindo total e avança pedido para Aguardando Entrega

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 5 (B3): AlertDialog de saldo pendente no PaymentModal

**Files:**
- Modify: `src/app/contas-pagar/_components/PaymentModal.tsx`

**Interfaces:**
- Consumes: `AlertDialog*` de `@/components/ui/alert-dialog`.
- Produces: nenhuma nova API pública; envia `quitarSaldo` no corpo do POST quando o usuário escolhe quitar.

- [ ] **Step 1: Importar o AlertDialog**

Adicionar aos imports:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
```

- [ ] **Step 2: Adicionar estado para o dialog**

Após `const [error, setError] = useState("")` (linha ~40):

```tsx
    const [confirmPartialOpen, setConfirmPartialOpen] = useState(false)
```

- [ ] **Step 3: Extrair a submissão para aceitar `quitarSaldo` e interceptar saldo pendente**

Substituir a função `handleSubmit` inteira (linhas ~75-109) por:

```tsx
    async function doPay(quitarSaldo: boolean) {
        setSubmitting(true)
        setError("")

        try {
            const idempotencyKey = `pay-${item.id}-${Date.now()}`
            const response = await fetch("/api/financeiro/payables/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conta_pagar_id: item.id,
                    conta_bancaria_id: Number(contaBancariaId),
                    valor: valorFinal,
                    data_pagamento: dataPagamento,
                    taxa_cartao_valor: taxaCartaoValor,
                    taxa_cartao_percentual: taxaCartaoPercentual,
                    idempotencyKey,
                    quitarSaldo,
                }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Erro ao processar pagamento")
            }

            onSuccess()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro inesperado"
            setError(message)
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    function handleSubmit() {
        if (!isValid) return
        const deixaSaldo = valorFinal < saldo - 0.01
        if (deixaSaldo) {
            setConfirmPartialOpen(true)
            return
        }
        void doPay(false)
    }
```

- [ ] **Step 4: Renderizar o AlertDialog**

Imediatamente antes do fechamento `</Dialog>` (última linha do JSX, após `</DialogContent>`), inserir:

```tsx
            <AlertDialog open={confirmPartialOpen} onOpenChange={setConfirmPartialOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ainda há saldo em aberto</AlertDialogTitle>
                        <AlertDialogDescription>
                            O valor informado ({formatCurrency(valorFinal)}) é menor que o saldo
                            de {formatCurrency(saldo)}. Deseja quitar a conta com este valor
                            (reduzindo o total) ou manter o saldo restante em aberto?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={submitting}
                            onClick={() => {
                                setConfirmPartialOpen(false)
                                void doPay(false)
                            }}
                        >
                            Deixar saldo em aberto
                        </Button>
                        <AlertDialogAction
                            disabled={submitting}
                            onClick={(e) => {
                                e.preventDefault()
                                setConfirmPartialOpen(false)
                                void doPay(true)
                            }}
                        >
                            Quitar conta
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
```

- [ ] **Step 5: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Verificação manual**

Run: `npm run dev`
1. Contas a Pagar → registrar baixa parcial (valor < saldo) → confirmar que aparece o AlertDialog.
2. "Quitar conta" → conta some da lista de pendentes, status `PAGO`, total reduzido.
3. Repetir e escolher "Deixar saldo em aberto" → conta fica `PARCIAL` com saldo restante.
4. Pagar o valor cheio → NÃO aparece o dialog (paga direto).
5. Para uma conta vinculada a pedido: após qualquer pagamento, abrir o Kanban de Pedidos de Compra e confirmar que o card foi para "Aguardando Entrega".

- [ ] **Step 7: Commit**

```bash
git add src/app/contas-pagar/_components/PaymentModal.tsx
git commit -m "feat: dialog pergunta se quita conta ou deixa saldo em aberto no pagamento parcial

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PARTE C — Item 4: Proposta de Serviço + PDF próprio

Nova tela dedicada (`/proposta-servico`) para propor serviços genéricos (reforma de coberta, caramanchão etc.) com campos livres (descrição, itens "material incluso") e campos de cálculo (mão de obra, materiais, frete, lucro → valor final). Gera um PDF próprio da marca (baseado no modelo "Iara 4194"). O PDF do cliente mostra **apenas** o valor final; a composição/lucro fica só na tela interna.

## Task 6 (C1): Modelo de dados (Prisma)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via CLI

**Interfaces:**
- Produces: models `proposta_servico`, `proposta_servico_item`, enum `PropostaStatus`, disponíveis em `@prisma/client` como `prisma.proposta_servico` e `prisma.proposta_servico_item`.

- [ ] **Step 1: Adicionar enum e models ao final de `prisma/schema.prisma`**

```prisma
enum PropostaStatus {
  RASCUNHO @map("Rascunho")
  ENVIADA  @map("Enviada")
}

model proposta_servico {
  id                Int             @id @default(autoincrement())
  titulo            String
  cliente_id        Int
  descricao_servico String          @db.Text
  dimensoes         String?
  status            PropostaStatus  @default(RASCUNHO)
  custo_mao_obra    Decimal         @default(0) @db.Decimal(10, 2)
  custo_materiais   Decimal         @default(0) @db.Decimal(10, 2)
  custo_frete       Decimal         @default(0) @db.Decimal(10, 2)
  lucro             Decimal         @default(0) @db.Decimal(10, 2)
  valor_final       Decimal         @default(0) @db.Decimal(10, 2)
  forma_pagamento   String?
  prazo_execucao    String?
  validade          DateTime?       @db.Date
  observacoes       String?         @db.Text
  link_pdf          String?
  created_by        Int?
  created_at        DateTime        @default(now())
  updated_at        DateTime        @updatedAt

  cliente Clientes                  @relation(fields: [cliente_id], references: [id])
  itens   proposta_servico_item[]

  @@index([cliente_id])
  @@index([status, created_at(sort: Desc)])
  @@map("proposta_servico")
}

model proposta_servico_item {
  id          Int    @id @default(autoincrement())
  proposta_id Int
  descricao   String

  proposta proposta_servico @relation(fields: [proposta_id], references: [id], onDelete: Cascade)

  @@index([proposta_id])
  @@map("proposta_servico_item")
}
```

Nota: o nome do model de cliente é `Clientes` no schema atual — **confirmar** o nome exato (grep `model Clientes` / `model cliente`) e ajustar o `@relation` e o back-relation. Adicionar o campo inverso no model de cliente: `propostas proposta_servico[]`.

- [ ] **Step 2: Confirmar o nome do model de cliente e ajustar relação**

Run: `grep -nE "^model (Cliente|Clientes|clientes)" prisma/schema.prisma`
Ajustar o `@relation` do model `proposta_servico` e adicionar `propostas proposta_servico[]` ao model retornado.

- [ ] **Step 3: Gerar a migration**

Run: `npx prisma migrate dev --name add_proposta_servico`
Expected: migration criada em `prisma/migrations/*_add_proposta_servico/` e cliente Prisma regenerado.

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros (tipos Prisma disponíveis).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: modelo de dados de proposta de serviço (proposta_servico + itens)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 7 (C2): Utilitário puro de cálculo da proposta + testes

**Files:**
- Create: `src/lib/proposta-utils.ts`
- Create: `src/lib/proposta-utils.test.ts`

**Interfaces:**
- Produces:
  - `type PropostaCustos = { maoObra: number; materiais: number; frete: number; lucro: number }`
  - `function calcularValorFinalProposta(c: PropostaCustos): number`
  - `function formatPropostaNumero(id: number): string` — ex. `"0007"`.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/proposta-utils.test.ts`:

```ts
import { expect, test } from "vitest"
import { calcularValorFinalProposta, formatPropostaNumero } from "@/lib/proposta-utils"

test("soma mão de obra + materiais + frete + lucro", () => {
  expect(calcularValorFinalProposta({ maoObra: 1000, materiais: 2000, frete: 300, lucro: 700 })).toBe(4000)
})

test("arredonda para 2 casas", () => {
  expect(calcularValorFinalProposta({ maoObra: 10.115, materiais: 0, frete: 0, lucro: 0 })).toBe(10.12)
})

test("formata número da proposta com zero-padding", () => {
  expect(formatPropostaNumero(7)).toBe("0007")
  expect(formatPropostaNumero(1234)).toBe("1234")
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test src/lib/proposta-utils.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Criar `src/lib/proposta-utils.ts`**

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test src/lib/proposta-utils.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/proposta-utils.ts src/lib/proposta-utils.test.ts
git commit -m "feat: utilitário de cálculo do valor final da proposta de serviço

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 8 (C3): Server actions da proposta

**Files:**
- Create: `src/actions/proposta-servico/index.ts`

**Interfaces:**
- Consumes: `prisma`, `calcularValorFinalProposta`.
- Produces:
  - `const propostaInputSchema` (zod) e `type PropostaInput`.
  - `async function salvarProposta(input: PropostaInput, userId?: number): Promise<{ id: number }>`
  - `async function atualizarProposta(id: number, input: PropostaInput): Promise<{ id: number }>`
  - `async function getProposta(id: number)` — proposta + itens + cliente.
  - `async function listPropostas()` — lista resumida ordenada por `created_at desc`.
  - `async function excluirProposta(id: number): Promise<void>`

- [ ] **Step 1: Criar `src/actions/proposta-servico/index.ts`**

```ts
"use server"

import { z } from "zod"

import { calcularValorFinalProposta } from "@/lib/proposta-utils"
import { prisma } from "@/lib/prisma"

export const propostaInputSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório").max(200),
  cliente_id: z.number().int().positive(),
  descricao_servico: z.string().min(1, "Descrição obrigatória"),
  dimensoes: z.string().optional().nullable(),
  itens: z.array(z.string().min(1)).default([]),
  custo_mao_obra: z.number().min(0).default(0),
  custo_materiais: z.number().min(0).default(0),
  custo_frete: z.number().min(0).default(0),
  lucro: z.number().min(0).default(0),
  forma_pagamento: z.string().optional().nullable(),
  prazo_execucao: z.string().optional().nullable(),
  validade: z.string().optional().nullable(), // ISO date-only
  observacoes: z.string().optional().nullable(),
  status: z.enum(["RASCUNHO", "ENVIADA"]).default("RASCUNHO"),
})

export type PropostaInput = z.infer<typeof propostaInputSchema>

function toData(input: PropostaInput, userId?: number) {
  const valorFinal = calcularValorFinalProposta({
    maoObra: input.custo_mao_obra,
    materiais: input.custo_materiais,
    frete: input.custo_frete,
    lucro: input.lucro,
  })

  return {
    titulo: input.titulo,
    cliente_id: input.cliente_id,
    descricao_servico: input.descricao_servico,
    dimensoes: input.dimensoes ?? null,
    status: input.status,
    custo_mao_obra: input.custo_mao_obra,
    custo_materiais: input.custo_materiais,
    custo_frete: input.custo_frete,
    lucro: input.lucro,
    valor_final: valorFinal,
    forma_pagamento: input.forma_pagamento ?? null,
    prazo_execucao: input.prazo_execucao ?? null,
    validade: input.validade ? new Date(input.validade) : null,
    observacoes: input.observacoes ?? null,
    created_by: userId ?? null,
  }
}

export async function salvarProposta(rawInput: PropostaInput, userId?: number) {
  const input = propostaInputSchema.parse(rawInput)
  const proposta = await prisma.proposta_servico.create({
    data: {
      ...toData(input, userId),
      itens: { create: input.itens.map((descricao) => ({ descricao })) },
    },
    select: { id: true },
  })
  return proposta
}

export async function atualizarProposta(id: number, rawInput: PropostaInput) {
  const input = propostaInputSchema.parse(rawInput)
  const data = toData(input)
  // created_by não deve ser sobrescrito na atualização
  delete (data as { created_by?: number | null }).created_by

  await prisma.$transaction(async (tx) => {
    await tx.proposta_servico.update({ where: { id }, data })
    await tx.proposta_servico_item.deleteMany({ where: { proposta_id: id } })
    if (input.itens.length > 0) {
      await tx.proposta_servico_item.createMany({
        data: input.itens.map((descricao) => ({ proposta_id: id, descricao })),
      })
    }
  })
  return { id }
}

export async function getProposta(id: number) {
  return prisma.proposta_servico.findUnique({
    where: { id },
    include: { itens: true, cliente: true },
  })
}

export async function listPropostas() {
  return prisma.proposta_servico.findMany({
    orderBy: { created_at: "desc" },
    include: { cliente: { select: { nome: true } } },
  })
}

export async function excluirProposta(id: number) {
  await prisma.proposta_servico.delete({ where: { id } })
}
```

Nota: ajustar `cliente: { select: { nome: true } }` ao nome real do campo de nome no model de cliente (confirmado na Task C1).

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros. Se `cliente`/`nome` divergirem, corrigir conforme o schema real.

- [ ] **Step 3: Commit**

```bash
git add src/actions/proposta-servico/index.ts
git commit -m "feat: server actions da proposta de serviço (CRUD)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 9 (C4): Tela de listagem + navegação

**Files:**
- Create: `src/app/proposta-servico/page.tsx`
- Create: `src/app/proposta-servico/_components/PropostaListClient.tsx`
- Modify: `src/components/ui/sidebar-navigation.ts`

**Interfaces:**
- Consumes: `listPropostas`, `excluirProposta`, `formatPropostaNumero`, `formatCurrency` (de `@/lib/financeiro-utils`).
- Produces: rota `/proposta-servico`.

- [ ] **Step 1: Adicionar o link na sidebar**

Em `src/components/ui/sidebar-navigation.ts`, importar um ícone (adicionar `FileText` à lista de imports de `lucide-react`) e inserir, logo após o item "Orçamentos" (linha ~96):

```ts
  {
    type: "link",
    label: "Proposta de Serviço",
    href: "/proposta-servico",
    icon: FileText,
  },
```

- [ ] **Step 2: Criar a página server `src/app/proposta-servico/page.tsx`**

```tsx
import { listPropostas } from "@/actions/proposta-servico"
import PropostaListClient from "./_components/PropostaListClient"

export const dynamic = "force-dynamic"

export default async function PropostaServicoPage() {
  const propostas = await listPropostas()
  const items = propostas.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    cliente: p.cliente?.nome ?? "—",
    valor_final: Number(p.valor_final),
    status: p.status,
    created_at: p.created_at.toISOString(),
  }))
  return <PropostaListClient items={items} />
}
```

- [ ] **Step 3: Criar `src/app/proposta-servico/_components/PropostaListClient.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { excluirProposta } from "@/actions/proposta-servico"
import { formatCurrency } from "@/lib/financeiro-utils"
import { formatPropostaNumero } from "@/lib/proposta-utils"

type Item = {
  id: number
  titulo: string
  cliente: string
  valor_final: number
  status: string
  created_at: string
}

export default function PropostaListClient({ items }: { items: Item[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await excluirProposta(deleteId)
      toast.success("Proposta excluída")
      setDeleteId(null)
      router.refresh()
    } catch {
      toast.error("Erro ao excluir proposta")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Propostas de Serviço</h1>
        <Button asChild className="btn-primary">
          <Link href="/proposta-servico/new"><Plus className="mr-2 size-4" /> Nova proposta</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Nº</th>
              <th className="p-3">Título</th>
              <th className="p-3 hidden sm:table-cell">Cliente</th>
              <th className="p-3">Valor</th>
              <th className="p-3 hidden sm:table-cell">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma proposta ainda.</td></tr>
            ) : items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-3">{formatPropostaNumero(it.id)}</td>
                <td className="p-3">
                  <Link href={`/proposta-servico/detalhes/${it.id}`} className="font-medium hover:underline">{it.titulo}</Link>
                </td>
                <td className="p-3 hidden sm:table-cell">{it.cliente}</td>
                <td className="p-3">{formatCurrency(it.valor_final)}</td>
                <td className="p-3 hidden sm:table-cell">{it.status}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(it.id)}>
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); void handleDelete() }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 4: Verificar compilação e rota**

Run: `npx tsc --noEmit`
Expected: sem erros.
Run: `npm run dev` → abrir `/proposta-servico` → tabela vazia com botão "Nova proposta"; link "Proposta de Serviço" aparece na sidebar após "Orçamentos".

- [ ] **Step 5: Commit**

```bash
git add src/app/proposta-servico/page.tsx src/app/proposta-servico/_components/PropostaListClient.tsx src/components/ui/sidebar-navigation.ts
git commit -m "feat: listagem de propostas de serviço + link na sidebar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 10 (C5): Formulário de criação/edição

**Files:**
- Create: `src/app/proposta-servico/_components/PropostaForm.tsx`
- Create: `src/app/proposta-servico/new/page.tsx`
- Create: `src/app/proposta-servico/edit/[id]/page.tsx`

**Interfaces:**
- Consumes: `salvarProposta`, `atualizarProposta` (via rota interna ou action direta), `getProposta`, `calcularValorFinalProposta`, `SearchableSelect`, componentes `ui/*`.
- Produces: rotas `/proposta-servico/new` e `/proposta-servico/edit/[id]`.
- Nota de padrão: server actions podem ser chamadas diretamente de client components importando-as (Next 15). Reutilizaremos essa forma. Para buscar clientes no `SearchableSelect`, reaproveitar a fonte de clientes já usada em `DadosPessoaisCard`/orçamento — carregar a lista no server component pai e passar como prop.

- [ ] **Step 1: Descobrir a fonte de clientes para o select**

Run: `grep -rn "findMany" src/actions | grep -i cliente | head`
Usar a action/consulta existente de listagem de clientes; se não houver uma reutilizável, no server component fazer `prisma.<clienteModel>.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } })`. Passar `clientes: {id, nome}[]` como prop ao form.

- [ ] **Step 2: Criar `src/app/proposta-servico/_components/PropostaForm.tsx`**

```tsx
"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { salvarProposta, atualizarProposta, type PropostaInput } from "@/actions/proposta-servico"
import { calcularValorFinalProposta } from "@/lib/proposta-utils"
import { formatCurrency } from "@/lib/financeiro-utils"

type ClienteOption = { id: number; nome: string }

export type PropostaInitial = Partial<PropostaInput> & { id?: number }

export default function PropostaForm({ clientes, initial }: { clientes: ClienteOption[]; initial?: PropostaInitial }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState(initial?.titulo ?? "")
  const [clienteId, setClienteId] = useState(initial?.cliente_id ? String(initial.cliente_id) : "")
  const [descricao, setDescricao] = useState(initial?.descricao_servico ?? "")
  const [dimensoes, setDimensoes] = useState(initial?.dimensoes ?? "")
  const [itens, setItens] = useState<string[]>(initial?.itens ?? [""])
  const [maoObra, setMaoObra] = useState(initial?.custo_mao_obra ?? 0)
  const [materiais, setMateriais] = useState(initial?.custo_materiais ?? 0)
  const [frete, setFrete] = useState(initial?.custo_frete ?? 0)
  const [lucro, setLucro] = useState(initial?.lucro ?? 0)
  const [formaPagamento, setFormaPagamento] = useState(initial?.forma_pagamento ?? "")
  const [prazo, setPrazo] = useState(initial?.prazo_execucao ?? "")
  const [validade, setValidade] = useState(initial?.validade ?? "")
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "")
  const [saving, setSaving] = useState(false)

  const valorFinal = useMemo(
    () => calcularValorFinalProposta({ maoObra, materiais, frete, lucro }),
    [maoObra, materiais, frete, lucro],
  )
  const clienteItems = useMemo(() => clientes.map((c) => ({ value: String(c.id), label: c.nome })), [clientes])
  const canSave = titulo.trim() && clienteId && descricao.trim()

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload: PropostaInput = {
        titulo,
        cliente_id: Number(clienteId),
        descricao_servico: descricao,
        dimensoes: dimensoes || null,
        itens: itens.map((i) => i.trim()).filter(Boolean),
        custo_mao_obra: maoObra,
        custo_materiais: materiais,
        custo_frete: frete,
        lucro,
        forma_pagamento: formaPagamento || null,
        prazo_execucao: prazo || null,
        validade: validade || null,
        observacoes: observacoes || null,
        status: "RASCUNHO",
      }
      const res = initial?.id
        ? await atualizarProposta(initial.id, payload)
        : await salvarProposta(payload)
      toast.success("Proposta salva")
      router.push(`/proposta-servico/detalhes/${res.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold">{initial?.id ? "Editar" : "Nova"} proposta de serviço</h1>

      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Reforma de coberta — Sra. Iara" />
        </div>
        <div className="space-y-2">
          <Label>Cliente</Label>
          <SearchableSelect value={clienteId} onValueChange={setClienteId} items={clienteItems}
            placeholder="Selecionar cliente" searchPlaceholder="Buscar cliente" />
        </div>
        <div className="space-y-2">
          <Label>Descrição do serviço</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5}
            placeholder="Execução completa da cobertura..." />
        </div>
        <div className="space-y-2">
          <Label>Dimensões (opcional)</Label>
          <Input value={dimensoes ?? ""} onChange={(e) => setDimensoes(e.target.value)} placeholder="5,00 m x 2,00 m" />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Label>Material incluso (aparece no PDF)</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setItens((v) => [...v, ""])}>
            <Plus className="mr-1 size-4" /> Adicionar item
          </Button>
        </div>
        {itens.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input value={item} onChange={(e) => setItens((v) => v.map((x, i) => (i === idx ? e.target.value : x)))}
              placeholder="Ex: Linha 10cm (Linha na Parede)" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setItens((v) => v.filter((_, i) => i !== idx))}>
              <Trash2 className="size-4 text-red-600" />
            </Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-4 p-4">
        <Label className="text-base font-semibold">Cálculo do valor (interno — não vai para o PDF)</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Mão de obra</Label>
            <Input type="number" step="0.01" min="0" value={maoObra} onChange={(e) => setMaoObra(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Materiais</Label>
            <Input type="number" step="0.01" min="0" value={materiais} onChange={(e) => setMateriais(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Frete</Label>
            <Input type="number" step="0.01" min="0" value={frete} onChange={(e) => setFrete(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Lucro</Label>
            <Input type="number" step="0.01" min="0" value={lucro} onChange={(e) => setLucro(Number(e.target.value))} /></div>
        </div>
        <div className="rounded-xl border border-[#E8D9BC] bg-[#FFF9EE] p-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#2C201B]/45">Valor final</p>
          <p className="mt-1 text-2xl font-semibold text-[#2E7D32]">{formatCurrency(valorFinal)}</p>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <Label className="text-base font-semibold">Condições comerciais</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2"><Label>Forma de pagamento</Label>
            <Input value={formaPagamento ?? ""} onChange={(e) => setFormaPagamento(e.target.value)} placeholder="60% entrada, 40% no término" /></div>
          <div className="space-y-2"><Label>Prazo de execução</Label>
            <Input value={prazo ?? ""} onChange={(e) => setPrazo(e.target.value)} placeholder="Até 20 dias" /></div>
          <div className="space-y-2"><Label>Validade</Label>
            <Input type="date" value={validade ?? ""} onChange={(e) => setValidade(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Observações (opcional)</Label>
          <Textarea value={observacoes ?? ""} onChange={(e) => setObservacoes(e.target.value)} rows={3} /></div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
        <Button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</> : "Salvar proposta"}
        </Button>
      </div>
    </div>
  )
}
```

Nota: confirmar que existe `@/components/ui/textarea` e `@/components/ui/card`. Se não existirem, usar `<textarea className="...">` nativo e um `<div className="rounded-xl border ...">` no lugar de `Card`.

- [ ] **Step 3: Criar `src/app/proposta-servico/new/page.tsx`**

```tsx
import { prisma } from "@/lib/prisma"
import PropostaForm from "../_components/PropostaForm"

export const dynamic = "force-dynamic"

export default async function NovaPropostaPage() {
  const clientes = await prisma.clientes.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } })
  return <PropostaForm clientes={clientes} />
}
```

(Ajustar `prisma.clientes` ao nome real do model.)

- [ ] **Step 4: Criar `src/app/proposta-servico/edit/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getProposta } from "@/actions/proposta-servico"
import PropostaForm from "../../_components/PropostaForm"

export const dynamic = "force-dynamic"

export default async function EditarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposta = await getProposta(Number(id))
  if (!proposta) notFound()
  const clientes = await prisma.clientes.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } })

  return (
    <PropostaForm
      clientes={clientes}
      initial={{
        id: proposta.id,
        titulo: proposta.titulo,
        cliente_id: proposta.cliente_id,
        descricao_servico: proposta.descricao_servico,
        dimensoes: proposta.dimensoes,
        itens: proposta.itens.map((i) => i.descricao),
        custo_mao_obra: Number(proposta.custo_mao_obra),
        custo_materiais: Number(proposta.custo_materiais),
        custo_frete: Number(proposta.custo_frete),
        lucro: Number(proposta.lucro),
        forma_pagamento: proposta.forma_pagamento,
        prazo_execucao: proposta.prazo_execucao,
        validade: proposta.validade ? proposta.validade.toISOString().slice(0, 10) : "",
        observacoes: proposta.observacoes,
      }}
    />
  )
}
```

- [ ] **Step 5: Verificar compilação e fluxo**

Run: `npx tsc --noEmit`
Run: `npm run dev` → `/proposta-servico/new` → preencher e salvar → redireciona para detalhes (Task C7 cria a tela; por ora pode dar 404, ok) → verificar no banco que a proposta e os itens foram criados (`npx prisma studio`).

- [ ] **Step 6: Commit**

```bash
git add src/app/proposta-servico/_components/PropostaForm.tsx src/app/proposta-servico/new src/app/proposta-servico/edit
git commit -m "feat: formulário de criação/edição de proposta de serviço

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 11 (C6): Template de PDF (react-pdf) + smoke test

**Files:**
- Modify: `package.json` (dep `@react-pdf/renderer`)
- Create: `public/images/proposta-capa.jpg`
- Create: `src/lib/pdf/PropostaServicoPDF.tsx`
- Create: `src/lib/pdf/PropostaServicoPDF.test.ts`

**Interfaces:**
- Produces:
  - `type PropostaPDFData = { numero: string; titulo: string; clienteNome: string; descricaoServico: string; dimensoes?: string | null; itens: string[]; valorFinal: number; formaPagamento?: string | null; prazoExecucao?: string | null; validade?: string | null }`
  - `function PropostaServicoDocument(props: { data: PropostaPDFData }): JSX.Element` — o `<Document>` react-pdf.
- Consumes: `@react-pdf/renderer` (`Document, Page, View, Text, Image, StyleSheet, Font`).

- [ ] **Step 1: Instalar a lib de PDF**

```bash
npm install @react-pdf/renderer@^4
```

- [ ] **Step 2: Adicionar a imagem de capa**

Reutilizar uma foto de cobertura de madeira da marca. Se não houver asset disponível, copiar temporariamente qualquer JPG de cobertura para `public/images/proposta-capa.jpg` e sinalizar ao usuário que o asset final deve substituí-lo. (O logo já existe em `public/images/logo.png`.)

- [ ] **Step 3: Criar `src/lib/pdf/PropostaServicoPDF.tsx`**

```tsx
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import path from "node:path"

export type PropostaPDFData = {
  numero: string
  titulo: string
  clienteNome: string
  descricaoServico: string
  dimensoes?: string | null
  itens: string[]
  valorFinal: number
  formaPagamento?: string | null
  prazoExecucao?: string | null
  validade?: string | null
}

const COLORS = {
  olive: "#3F3D1E",
  cream: "#FDF3E3",
  gold: "#E0B64F",
  green: "#2E7D32",
  dark: "#2C201B",
  white: "#FFFFFF",
}

const CNPJ = "59.769.971/0001-43"
const WHATSAPP = "(85) 9 9411-5576"

// Assets resolvidos a partir da pasta public (execução server-side)
const publicDir = path.join(process.cwd(), "public", "images")
const CAPA = path.join(publicDir, "proposta-capa.jpg")
const LOGO = path.join(publicDir, "logo.png")

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const styles = StyleSheet.create({
  page: { fontSize: 11, color: COLORS.dark },
  coverImage: { position: "absolute", top: 0, left: 0, width: "100%", height: 560 },
  coverBand: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.olive, padding: 32, minHeight: 260 },
  coverKicker: { color: COLORS.cream, fontSize: 12, marginBottom: 8 },
  coverRule: { width: 80, height: 4, backgroundColor: COLORS.gold, marginBottom: 16 },
  coverTitle: { color: COLORS.cream, fontSize: 40, fontWeight: 700, lineHeight: 1.1 },
  coverSubtitle: { color: COLORS.white, fontSize: 22, marginTop: 8 },
  coverLogo: { position: "absolute", right: 32, bottom: 32, width: 96, height: 96, backgroundColor: COLORS.white, borderRadius: 12, padding: 8 },
  section: { padding: 40 },
  h2: { fontSize: 26, fontWeight: 700, color: COLORS.dark },
  h2rule: { width: 80, height: 4, backgroundColor: COLORS.gold, marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: COLORS.cream, borderRadius: 16, padding: 24 },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  paragraph: { lineHeight: 1.5 },
  dims: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.gold, fontWeight: 700 },
  materiaisTitle: { fontSize: 16, fontWeight: 700, marginTop: 40, marginBottom: 16 },
  materiaisGrid: { flexDirection: "row", flexWrap: "wrap" },
  materialItem: { width: "50%", flexDirection: "row", marginBottom: 12 },
  bullet: { marginRight: 8 },
  priceCard: { borderWidth: 1, borderColor: COLORS.gold, borderRadius: 16, padding: 32, alignItems: "center", marginTop: 8 },
  price: { fontSize: 36, fontWeight: 700, color: COLORS.green },
  priceHint: { marginTop: 8, color: COLORS.dark, opacity: 0.6 },
  condTitle: { fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 16 },
  condRow: { flexDirection: "row", gap: 12 },
  condCard: { flex: 1, borderWidth: 1, borderColor: "#EFE7D5", borderRadius: 12, padding: 16, alignItems: "center" },
  condCardTitle: { fontWeight: 700, marginBottom: 6 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.olive, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", justifyContent: "space-between" },
  footerText: { color: COLORS.cream, fontSize: 10 },
})

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>CNPJ: {CNPJ}</Text>
      <Text style={styles.footerText}>Whatsapp: {WHATSAPP}</Text>
    </View>
  )
}

export function PropostaServicoDocument({ data }: { data: PropostaPDFData }) {
  return (
    <Document>
      {/* Capa */}
      <Page size="A4" style={styles.page}>
        <Image src={CAPA} style={styles.coverImage} />
        <View style={styles.coverBand}>
          <Text style={styles.coverKicker}>Proposta nº {data.numero}</Text>
          <View style={styles.coverRule} />
          <Text style={styles.coverTitle}>Proposta{"\n"}de Serviço</Text>
          <Text style={styles.coverSubtitle}>{data.titulo}</Text>
        </View>
        <Image src={LOGO} style={styles.coverLogo} />
      </Page>

      {/* Descrição */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h2}>Descrição do Serviço</Text>
          <View style={styles.h2rule} />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalhes do projeto</Text>
            <Text style={styles.paragraph}>{data.descricaoServico}</Text>
            {data.dimensoes ? <Text style={styles.dims}>Dimensões: {data.dimensoes}</Text> : null}
          </View>

          {data.itens.length > 0 ? (
            <>
              <Text style={styles.materiaisTitle}>Material incluso no valor desta proposta:</Text>
              <View style={styles.materiaisGrid}>
                {data.itens.map((it, i) => (
                  <View key={i} style={styles.materialItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text>{it}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
        <Footer />
      </Page>

      {/* Investimento */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h2}>Investimento</Text>
          <View style={styles.h2rule} />
          <View style={styles.priceCard}>
            <Text style={styles.price}>{brl(data.valorFinal)}</Text>
            <Text style={styles.priceHint}>OU À VISTA NO PIX COM SUPER DESCONTO</Text>
          </View>

          <Text style={styles.condTitle}>Condições comerciais</Text>
          <View style={styles.condRow}>
            <View style={styles.condCard}>
              <Text style={styles.condCardTitle}>Forma de pagamento</Text>
              <Text>{data.formaPagamento || "A combinar"}</Text>
            </View>
            <View style={styles.condCard}>
              <Text style={styles.condCardTitle}>Prazo de execução</Text>
              <Text>{data.prazoExecucao || "A combinar"}</Text>
            </View>
            <View style={styles.condCard}>
              <Text style={styles.condCardTitle}>Validade</Text>
              <Text>{data.validade || "—"}</Text>
            </View>
          </View>
        </View>
        <Footer />
      </Page>
    </Document>
  )
}
```

Nota sobre fontes: as fontes padrão do react-pdf (Helvetica) suportam acentos latinos. Se o negrito/acentuação exigir uma TTF customizada, registrar via `Font.register({ family: "Inter", fonts: [...] })` apontando para TTFs em `public/fonts/` e trocar `fontWeight` por `fontFamily`. Manter Helvetica no MVP.

- [ ] **Step 4: Criar o smoke test `src/lib/pdf/PropostaServicoPDF.test.ts`**

```ts
import { renderToBuffer } from "@react-pdf/renderer"
import { expect, test } from "vitest"
import { PropostaServicoDocument, type PropostaPDFData } from "@/lib/pdf/PropostaServicoPDF"

test("renderiza um PDF não-vazio", async () => {
  const data: PropostaPDFData = {
    numero: "0001",
    titulo: "Reforma de coberta — Teste",
    clienteNome: "Cliente Teste",
    descricaoServico: "Execução completa da cobertura em massaranduba.",
    dimensoes: "5,00 m x 2,00 m",
    itens: ["Linha 10cm", "Caibros", "Parafusos Franceses"],
    valorFinal: 7300,
    formaPagamento: "60% entrada, 40% no término",
    prazoExecucao: "Até 20 dias",
    validade: "07/07/2026",
  }
  const buffer = await renderToBuffer(<PropostaServicoDocument data={data} /> as any)
  expect(buffer.length).toBeGreaterThan(1000)
  // Assinatura de arquivo PDF
  expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
})
```

Nota: como o teste usa JSX, renomear para `.test.tsx`. Ajustar o `include` do vitest já cobre `.test.tsx`. O `as any` evita atrito de tipos entre a versão de React types e react-pdf; se compilar sem ele, remover.

- [ ] **Step 5: Rodar o smoke test**

Run: `npm run test src/lib/pdf/PropostaServicoPDF.test.tsx`
Expected: PASS. Se falhar ao achar a imagem de capa/logo durante o render, garantir que `public/images/proposta-capa.jpg` e `public/images/logo.png` existem.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json public/images/proposta-capa.jpg src/lib/pdf/PropostaServicoPDF.tsx src/lib/pdf/PropostaServicoPDF.test.tsx
git commit -m "feat: template de PDF da proposta de serviço (react-pdf) + smoke test

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task 12 (C7): Rota de PDF + tela de detalhes com botão Gerar PDF

**Files:**
- Create: `src/app/api/proposta-servico/[id]/pdf/route.ts`
- Create: `src/app/proposta-servico/detalhes/[id]/page.tsx`

**Interfaces:**
- Consumes: `getProposta`, `PropostaServicoDocument`, `formatPropostaNumero`, `renderToBuffer` de `@react-pdf/renderer`.
- Produces: `GET /api/proposta-servico/[id]/pdf` → `application/pdf`; rota `/proposta-servico/detalhes/[id]`.

- [ ] **Step 1: Criar a rota `src/app/api/proposta-servico/[id]/pdf/route.ts`**

```ts
import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProposta } from "@/actions/proposta-servico"
import { PropostaServicoDocument } from "@/lib/pdf/PropostaServicoPDF"
import { formatPropostaNumero } from "@/lib/proposta-utils"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const proposta = await getProposta(Number(id))
  if (!proposta) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 })

  const numero = formatPropostaNumero(proposta.id)
  const buffer = await renderToBuffer(
    PropostaServicoDocument({
      data: {
        numero,
        titulo: proposta.titulo,
        clienteNome: proposta.cliente?.nome ?? "",
        descricaoServico: proposta.descricao_servico,
        dimensoes: proposta.dimensoes,
        itens: proposta.itens.map((i) => i.descricao),
        valorFinal: Number(proposta.valor_final),
        formaPagamento: proposta.forma_pagamento,
        prazoExecucao: proposta.prazo_execucao,
        validade: proposta.validade ? proposta.validade.toLocaleDateString("pt-BR") : null,
      },
    }),
  )

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Proposta-${numero}.pdf"`,
    },
  })
}
```

Nota: chamar `PropostaServicoDocument({ data })` como função (não JSX) evita a necessidade de `.tsx` na rota. Se o TS reclamar do tipo de retorno em `renderToBuffer`, envolver com `as any` no argumento.

- [ ] **Step 2: Criar `src/app/proposta-servico/detalhes/[id]/page.tsx`**

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProposta } from "@/actions/proposta-servico"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/financeiro-utils"
import { formatPropostaNumero } from "@/lib/proposta-utils"

export const dynamic = "force-dynamic"

export default async function DetalhesPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposta = await getProposta(Number(id))
  if (!proposta) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Proposta nº {formatPropostaNumero(proposta.id)}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href={`/proposta-servico/edit/${proposta.id}`}>Editar</Link></Button>
          <Button asChild className="btn-primary">
            <a href={`/api/proposta-servico/${proposta.id}/pdf`} target="_blank" rel="noopener noreferrer">Gerar PDF</a>
          </Button>
        </div>
      </div>

      <Card className="space-y-2 p-4">
        <p className="text-lg font-medium">{proposta.titulo}</p>
        <p className="text-sm text-muted-foreground">Cliente: {proposta.cliente?.nome ?? "—"}</p>
        <p className="whitespace-pre-wrap">{proposta.descricao_servico}</p>
        {proposta.dimensoes ? <p className="text-sm">Dimensões: {proposta.dimensoes}</p> : null}
      </Card>

      {proposta.itens.length > 0 ? (
        <Card className="p-4">
          <p className="mb-2 font-semibold">Material incluso</p>
          <ul className="list-inside list-disc columns-2 text-sm">
            {proposta.itens.map((i) => <li key={i.id}>{i.descricao}</li>)}
          </ul>
        </Card>
      ) : null}

      <Card className="p-4">
        <p className="mb-2 font-semibold">Investimento</p>
        <p className="text-2xl font-semibold text-[#2E7D32]">{formatCurrency(Number(proposta.valor_final))}</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div><span className="text-muted-foreground">Forma de pagamento:</span> {proposta.forma_pagamento || "—"}</div>
          <div><span className="text-muted-foreground">Prazo:</span> {proposta.prazo_execucao || "—"}</div>
          <div><span className="text-muted-foreground">Validade:</span> {proposta.validade ? proposta.validade.toLocaleDateString("pt-BR") : "—"}</div>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verificar compilação e fluxo E2E**

Run: `npx tsc --noEmit`
Run: `npm run dev`
1. `/proposta-servico/new` → criar proposta com cliente, descrição, 3+ itens, custos e condições → salvar.
2. Redireciona para `/proposta-servico/detalhes/[id]` → conferir dados.
3. "Gerar PDF" → abre o PDF em nova aba → comparar com o modelo "Iara 4194": capa (nº, título, subtítulo, logo), página de descrição (card creme + material incluso em 2 colunas), página investimento (valor único verde + condições + rodapé CNPJ/Whatsapp).
4. Confirmar que **lucro e composição de custos NÃO aparecem** no PDF.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/proposta-servico src/app/proposta-servico/detalhes
git commit -m "feat: rota de PDF e tela de detalhes da proposta de serviço

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verificação final (todos os itens)

- [ ] **Rodar toda a suíte de testes**

Run: `npm run test`
Expected: todos os testes de `balancete-tree`, `payment-rules`, `proposta-utils` e o smoke do PDF passam.

- [ ] **Type-check e build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: sem erros.

- [ ] **Checklist funcional manual**
  - Item 7: transferência não infla o Balancete; Balancete × DRE batem no mesmo período.
  - Item 5: pagamento parcial abre o dialog; "Quitar" reduz total→PAGO; "Deixar em aberto"→PARCIAL; pedido vinculado vai para "Aguardando Entrega" em qualquer pagamento; pagamento integral não abre dialog.
  - Item 4: criar/editar/excluir proposta; PDF gerado fiel ao modelo; sem lucro no PDF.

---

## Notas de execução / riscos

- **Nome do model de cliente:** vários trechos assumem `prisma.clientes` / `cliente.nome`. Confirmar na Task C1 (grep) e ajustar em C3/C5/C7.
- **Componentes `Textarea`/`Card`:** confirmar existência em `@/components/ui/`; fallback para elementos nativos.
- **Assets do PDF:** `public/images/proposta-capa.jpg` é placeholder até o usuário fornecer a foto de capa oficial da marca; o logo já existe.
- **Fontes do PDF:** MVP usa Helvetica (suporta acentos). Se o cliente exigir a tipografia exata do modelo, registrar TTF em `public/fonts/` e trocar para `fontFamily`.
- **`revert.ts` (estorno):** não replica o "não-regredir" de status do pedido — follow-up fora do escopo (o estorno já ressincroniza o `valor_realizado`).
- **Testes de integração de DB:** não incluídos (não há test DB configurado). A reconciliação dos relatórios é verificada manualmente + pela função pura `buildBalanceteTree`.

## Self-Review (executado)

- **Cobertura do spec:** item 4 (tela+PDF) → C1–C7; item 5 (automação+dialog) → B1–B3; item 7 (relatórios) → A1–A2. ✔
- **Placeholders:** nenhum "TBD"; código completo em cada step; assets/nome-de-model sinalizados com passo de verificação concreto (grep). ✔
- **Consistência de tipos:** `resolvePaymentOutcome`/`shouldAdvancePedidoToAwaitingDelivery` usados em B2 conforme B1; `PropostaPDFData` idêntico entre C6 (definição) e C7 (uso); `PropostaInput` idêntico entre C3 e C5. ✔
