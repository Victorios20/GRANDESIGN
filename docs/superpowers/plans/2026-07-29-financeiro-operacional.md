# Financeiro Operacional — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o financeiro operável no dia a dia: datas corretas, filtros úteis, IDs visíveis e clicáveis, baixa parcial sem perda de saldo, conta paga corrigível sem estorno, e conta a pagar de material nascendo junto com a obra.

**Architecture:** Todas as mudanças seguem os padrões já existentes no repo: datas date-only normalizadas em meio-dia UTC via `src/lib/date-only.ts`; status "em aberto" já modelado em `OPEN_FINANCIAL_STATUSES`; deep-link `?highlight=<id>` já abre o editor nas telas de contas; integração pedido→conta reutiliza `integrarPedidoCompraAoFinanceiroInTransaction`. Nenhuma migration de banco é necessária neste plano.

**Tech Stack:** Next.js App Router, Prisma 6, TypeScript, testes via scripts `tsx` (`scripts/test-*.ts`, padrão `scripts/test-payable-status.ts`), sem framework de teste.

## Global Constraints

- Nenhum novo status no enum `StatusFinanceiro` (decisão do Edson: "só lança a conta a pagar direto e mantém as contas a pagar como estão hoje").
- Datas em colunas `@db.Date` sempre gravadas em meio-dia UTC (`parseDateOnlyInput`/`zDateOnly`), nunca `new Date()` cru. `process.env.TZ = America/Sao_Paulo` está setado em `next.config.ts:4` — é o que faz `new Date()` cru virar bug.
- Comandos de teste: `npm test` roda a cadeia de scripts tsx. Cada script novo entra em `package.json` e na cadeia do `"test"`.
- Textos de UI em pt-BR, tom dos textos existentes (sem jargão técnico).
- Commits pequenos por task, mensagens em pt-BR seguindo o padrão do repo (`fix:`, `feat:`, `chore:`).
- Fora de escopo deste plano: default do filtro em `/pedido_compra` (statuses não são financeiros; decidir com o Edson qual aba default), limpeza das quitações de R$ 1,00 (script sobre produção, requer aprovação explícita), e o bloco Telha (plano próprio `2026-07-29-telha-por-fornecedor.md`).

---

### Task 1: Datas date-only na integração financeira do pedido

Conta a pagar criada via integração grava `data_emissao`/`data_vencimento` com `new Date()` cru ([manage-finance-integration.ts:381](../../../src/actions/pedido_compra/manage-finance-integration.ts)); depois das 21h de Brasília o dia gravado é o seguinte. Mesmo bug no `reversalDate` dos estornos e no `data_emissao` dos syncs de obra.

**Files:**
- Modify: `src/lib/date-only.ts`
- Modify: `src/actions/pedido_compra/manage-finance-integration.ts`
- Modify: `src/actions/financeiro/payables/sync-obra-payables.ts`
- Modify: `src/actions/financeiro/receivables/sync-obra-receivables.ts`
- Modify: `package.json`
- Test: `scripts/test-date-only.ts`

**Interfaces:**
- Produces: `getTodayDateOnlyDate(): Date` exportada de `src/lib/date-only.ts` — retorna o dia de hoje (fuso local) como `Date` em meio-dia UTC. Tasks 7 e 8 dependem dela.

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/test-date-only.ts`:

```ts
import assert from "node:assert/strict"

import {
    formatDateOnlyPtBr,
    fromDateOnlyDb,
    getTodayDateOnly,
    getTodayDateOnlyDate,
    parseDateOnlyInput,
    shiftDateOnly,
} from "../src/lib/date-only"

const today = getTodayDateOnlyDate()
assert.equal(today.getUTCHours(), 12, "dia de hoje deve ser meio-dia UTC")
assert.equal(fromDateOnlyDb(today), getTodayDateOnly(), "round-trip do dia de hoje")

assert.equal(parseDateOnlyInput("2026-07-29")!.toISOString(), "2026-07-29T12:00:00.000Z")
assert.equal(fromDateOnlyDb(new Date(Date.UTC(2026, 6, 29, 23, 59))), "2026-07-29")
assert.equal(shiftDateOnly("2026-07-31", 1), "2026-08-01")
assert.equal(formatDateOnlyPtBr("2026-07-29"), "29/07/2026")

console.log("date-only rules: ok")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx tsx scripts/test-date-only.ts`
Expected: FAIL — `getTodayDateOnlyDate` não é exportada (`is not a function` / erro de import).

- [ ] **Step 3: Implementar o helper**

Em `src/lib/date-only.ts`, logo após `getTodayDateOnly()`:

```ts
/**
 * Dia de hoje (fuso local) como Date em meio-dia UTC — o mesmo referencial
 * usado por parseDateOnlyInput/zDateOnly. Usar SEMPRE que for gravar "hoje"
 * em coluna @db.Date, no lugar de new Date() cru.
 */
export function getTodayDateOnlyDate(): Date {
  return parseDateOnlyInput(getTodayDateOnly())!
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx tsx scripts/test-date-only.ts`
Expected: `date-only rules: ok`

- [ ] **Step 5: Corrigir os pontos de gravação**

Em `src/actions/pedido_compra/manage-finance-integration.ts`:

1. Adicionar ao bloco de imports do topo:

```ts
import { getTodayDateOnlyDate } from "@/lib/date-only"
```

2. Em `integrarPedidoCompraAoFinanceiroInTransaction` (busca: `const now = new Date()` dentro do `try` que cria a conta), trocar o uso nas datas da conta — `now` continua existindo para os timestamps `financeiro_integrado_em`:

```ts
    const now = new Date()
    const emissao = getTodayDateOnlyDate()
```

e no `tx.contaPagar.create`:

```ts
        data_emissao: emissao,
        data_vencimento: pedido.data_entrega ?? emissao,
```

3. Em `createReverseLancamentos` (busca: `const reversalDate = new Date()`):

```ts
  const reversalDate = getTodayDateOnlyDate()
```

Em `src/actions/financeiro/payables/sync-obra-payables.ts` (busca: `data_emissao: startOfDate(new Date())`):

```ts
                data_emissao: getTodayDateOnlyDate(),
```

com o import `import { getTodayDateOnlyDate } from "@/lib/date-only"` no topo. Mesma troca em `src/actions/financeiro/receivables/sync-obra-receivables.ts` (mesma linha-padrão, mesmo import).

- [ ] **Step 6: Encadear o teste**

Em `package.json`:

```json
    "test": "npm run test:payable-status && npm run test:date-only",
    "test:date-only": "tsx scripts/test-date-only.ts",
```

- [ ] **Step 7: Validar**

Run: `npm test && npx tsc --noEmit`
Expected: os dois scripts imprimem ok; tsc sem erros novos.

- [ ] **Step 8: Commit**

```bash
git add src/lib/date-only.ts src/actions/pedido_compra/manage-finance-integration.ts src/actions/financeiro/payables/sync-obra-payables.ts src/actions/financeiro/receivables/sync-obra-receivables.ts scripts/test-date-only.ts package.json
git commit -m "fix(financeiro): datas date-only na integração e estorno (bug do dia seguinte após 21h)"
```

---

### Task 2: Orçado vs realizado — data correta e ID clicável para a conta

O detalhe da linha mostra a data um dia atrás (`format(new Date(...))` reinterpreta meia-noite UTC no fuso local) e o link do ID leva para `/lancamentos`, não para a conta. O deep-link `?highlight=<id>` já existe nas duas telas de contas e abre o editor.

**Files:**
- Modify: `src/app/api/financeiro/reports/orcado-realizado/lancamentos/route.ts`
- Modify: `src/app/obras/[id]/orcado-vs-realizado/components/OrcadoRealizadoDashboard.tsx`

**Interfaces:**
- Produces: itens do endpoint ganham `contaPagarId: number | null` e `contaReceberId: number | null`.

- [ ] **Step 1: Expor os IDs das contas no endpoint**

Em `src/app/api/financeiro/reports/orcado-realizado/lancamentos/route.ts`, no `transactions.map` (busca: `const items = transactions.map`):

```ts
        const items = transactions.map((transaction) => ({
            id: transaction.id,
            data: transaction.data_competencia,
            descricao: transaction.descricao,
            conta: transaction.conta_bancaria?.nome ?? "Não definida",
            valor: Number(transaction.valor),
            fornecedor: transaction.conta_pagar?.fornecedor?.nome || transaction.conta_receber?.cliente?.nome || "-",
            categoriaOriginal: transaction.categoria.nome,
            conciliado: transaction.status_conferencia === StatusConferencia.CONFERIDO,
            contaPagarId: transaction.conta_pagar_id,
            contaReceberId: transaction.conta_receber_id,
        }))
```

- [ ] **Step 2: Corrigir data e link no dashboard**

Em `src/app/obras/[id]/orcado-vs-realizado/components/OrcadoRealizadoDashboard.tsx`:

1. Localizar o tipo dos itens (busca: `TransactionItem`) e adicionar os campos:

```ts
    contaPagarId: number | null
    contaReceberId: number | null
```

2. Adicionar import: `import { formatDateOnlyPtBr } from "@/lib/date-only"`.

3. No corpo do map das linhas (busca: `{items.map((transaction) => (`), antes do `return`/JSX da linha, derivar o destino:

```tsx
const contaHref = transaction.contaPagarId
    ? `/contas-pagar?highlight=${transaction.contaPagarId}`
    : transaction.contaReceberId
        ? `/contas-receber?highlight=${transaction.contaReceberId}`
        : `/lancamentos?transaction_id=${transaction.id}`
```

(Se o JSX for expressão direta sem corpo, converter o callback para corpo com `return`.)

4. Trocar o `href` do `Link` que envolve `#{transaction.id}` de `` `/lancamentos?transaction_id=${transaction.id}` `` para `{contaHref}`.

5. Trocar a célula de data (busca: `format(new Date(transaction.data), "dd/MM/yyyy")`):

```tsx
<TableCell className="py-1 text-xs">{formatDateOnlyPtBr(transaction.data)}</TableCell>
```

Se `format`/`new Date` não for mais usado no arquivo, remover o import do `date-fns`.

- [ ] **Step 3: Validar**

Run: `npx tsc --noEmit`
Expected: sem erros. Validação manual (dev server): abrir uma obra → orçado vs realizado → expandir uma categoria → a data bate com a tela de contas e o clique no ID abre a conta certa com o editor.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/financeiro/reports/orcado-realizado/lancamentos/route.ts "src/app/obras/[id]/orcado-vs-realizado/components/OrcadoRealizadoDashboard.tsx"
git commit -m "fix(relatorios): data correta e link direto para a conta no detalhe do orçado vs realizado"
```

---

### Task 3: Contas a pagar e a receber abrem em "Em aberto"

Hoje ambas abrem em "Todos". "Em aberto" = `PENDENTE + PARCIAL + ATRASADO` (conceito já existente em `OPEN_FINANCIAL_STATUSES`, [open-status.ts:6](../../../src/actions/financeiro/shared/open-status.ts)). O backend já aceita lista: `?status=A,B,C` vira `{ in: [...] }` ([route.ts do payables, bloco `statusParam.split(",")`]).

**Files:**
- Modify: `src/app/contas-pagar/page.tsx`
- Modify: `src/app/contas-pagar/_components/ContasPagarPageClient.tsx`
- Modify: `src/app/contas-receber/page.tsx`
- Modify: `src/app/contas-receber/_components/ContasReceberPageClient.tsx`

**Interfaces:**
- Consumes: `summary.statusCounts` (chaves `PENDENTE`, `PARCIAL`, `ATRASADO`, `PAGO`, `CANCELADO`, `todos`) do endpoint de summary — já existe.
- Produces: valor de filtro de UI `"EM_ABERTO"` que o cliente traduz para `status=PENDENTE,PARCIAL,ATRASADO` na query. Não vaza para a API como valor literal.

- [ ] **Step 1: SSR default em contas a pagar**

Em `src/app/contas-pagar/page.tsx`, função `buildInitialQuery`, após a linha `if (status) query.set("status", status)` e as regras de `scope`, adicionar o default (atenção: depois do bloco `scope === "overdue"` para não sobrescrever):

```ts
    if (!query.get("status")) query.set("status", "PENDENTE,PARCIAL,ATRASADO")
```

- [ ] **Step 2: Cliente de contas a pagar**

Em `src/app/contas-pagar/_components/ContasPagarPageClient.tsx`:

1. Tipo do filtro (busca: `type FinancialStatusFilter =`):

```ts
type FinancialStatusFilter = "todos" | "EM_ABERTO" | "PENDENTE" | "PARCIAL" | "ATRASADO" | "PAGO" | "CANCELADO"
```

2. Constante junto às demais do topo do arquivo:

```ts
const OPEN_STATUS_PARAM = "PENDENTE,PARCIAL,ATRASADO"
```

3. Estado inicial (busca: `useState<FinancialStatusFilter>`):

```ts
    const [statusFilter, setStatusFilter] = useState<FinancialStatusFilter>(
        initialFilters.status && isFinancialStatus(initialFilters.status) ? initialFilters.status : "EM_ABERTO"
    )
```

4. No `fetchData` (busca: `if (statusFilter !== "todos") params.set("status", statusFilter)`):

```ts
            if (statusFilter === "EM_ABERTO") params.set("status", OPEN_STATUS_PARAM)
            else if (statusFilter !== "todos") params.set("status", statusFilter)
```

5. Nas opções de tab (busca: `{ value: "todos", label: "Todos" }` na constante `FINANCIAL_STATUS_OPTIONS` ou no memo `statusTabItems` — aplicar onde as tabs são montadas), inserir "Em aberto" como PRIMEIRO item, com contagem somada:

```ts
        {
            value: "EM_ABERTO" as const,
            label: "Em aberto",
            count:
                (summary?.statusCounts?.PENDENTE ?? 0) +
                (summary?.statusCounts?.PARCIAL ?? 0) +
                (summary?.statusCounts?.ATRASADO ?? 0),
        },
```

6. `hasActiveFilters` (busca: `statusFilter !== "todos"`): o default deixa de contar como filtro ativo:

```ts
    const hasActiveFilters = hasAdvancedFilters || Boolean(search.trim()) || (statusFilter !== "todos" && statusFilter !== "EM_ABERTO") || Boolean(dateRange?.from)
```

7. `clearFilters` e o handler de remoção de chip (busca: `setStatusFilter("todos")`, duas ocorrências): trocar por `setStatusFilter("EM_ABERTO")`.

8. No memo de chips de filtro ativos (busca: `if (statusFilter !== "todos") {` dentro do `useMemo` de labels): trocar a condição para `if (statusFilter !== "todos" && statusFilter !== "EM_ABERTO") {`.

- [ ] **Step 3: Espelhar em contas a receber**

Aplicar exatamente as mesmas 8 mudanças em `src/app/contas-receber/page.tsx` (`buildInitialQuery`) e `src/app/contas-receber/_components/ContasReceberPageClient.tsx` — o arquivo é espelho do de pagar (mesmos nomes: `FinancialStatusFilter`, `statusFilter`, `fetchData`, `clearFilters`). O rótulo da tab é o mesmo: "Em aberto".

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit`
Expected: sem erros. Manual: `/contas-pagar` abre na tab "Em aberto" com pendente+parcial+atrasado; a conta parcial do exemplo do Edson (R$ 450 restantes) aparece; "Todos" continua funcionando; deep-links com `?status=PAGO` respeitam o parâmetro.

- [ ] **Step 5: Commit**

```bash
git add src/app/contas-pagar/page.tsx src/app/contas-pagar/_components/ContasPagarPageClient.tsx src/app/contas-receber/page.tsx src/app/contas-receber/_components/ContasReceberPageClient.tsx
git commit -m "feat(financeiro): contas a pagar e a receber abrem no recorte Em aberto"
```

---

### Task 4: Coluna de ID e busca por ID nas contas

Não existe coluna de ID nas tabelas e a busca só olha `descricao`. O Edson pediu as duas coisas explicitamente.

**Files:**
- Modify: `src/actions/financeiro/payables/get.ts`
- Modify: `src/actions/financeiro/receivables/service.ts`
- Modify: `src/app/contas-pagar/_components/ContasPagarPageClient.tsx`
- Modify: `src/app/contas-receber/_components/ContasReceberPageClient.tsx`
- Test: `scripts/test-search-filter.ts`

**Interfaces:**
- Produces: `buildSearchWhere(search: string): { OR: ... }` — helper puro exportado de `src/actions/financeiro/shared/search.ts` usado pelos dois lados.

- [ ] **Step 1: Teste do helper de busca**

Criar `scripts/test-search-filter.ts`:

```ts
import assert from "node:assert/strict"

import { buildSearchWhere } from "../src/actions/financeiro/shared/search"

assert.deepEqual(buildSearchWhere("madeira"), {
    OR: [{ descricao: { contains: "madeira", mode: "insensitive" } }],
})

assert.deepEqual(buildSearchWhere("482"), {
    OR: [{ descricao: { contains: "482", mode: "insensitive" } }, { id: 482 }],
})

assert.deepEqual(buildSearchWhere("#482"), {
    OR: [{ descricao: { contains: "#482", mode: "insensitive" } }, { id: 482 }],
})

assert.deepEqual(buildSearchWhere("48.2"), {
    OR: [{ descricao: { contains: "48.2", mode: "insensitive" } }],
})

console.log("search filter rules: ok")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx tsx scripts/test-search-filter.ts`
Expected: FAIL — módulo `search` não existe.

- [ ] **Step 3: Implementar o helper**

Criar `src/actions/financeiro/shared/search.ts`:

```ts
/**
 * Filtro de busca das listas financeiras: sempre por descrição e,
 * quando o termo é um inteiro positivo (aceita prefixo #), também por ID.
 */
export function buildSearchWhere(search: string) {
    const term = search.trim()
    const digits = term.replace(/^#/, "")
    const asId = /^\d+$/.test(digits) ? Number(digits) : null

    return {
        OR: [
            { descricao: { contains: term, mode: "insensitive" as const } },
            ...(asId && asId > 0 ? [{ id: asId }] : []),
        ],
    }
}
```

- [ ] **Step 4: Rodar e ver passar; encadear**

Run: `npx tsx scripts/test-search-filter.ts`
Expected: `search filter rules: ok`

Em `package.json`: `"test": "npm run test:payable-status && npm run test:date-only && npm run test:search-filter"` e `"test:search-filter": "tsx scripts/test-search-filter.ts"`.

- [ ] **Step 5: Usar no backend dos dois lados**

Em `src/actions/financeiro/payables/get.ts`, função `buildPayablesWhere` (busca: `if (search) where.descricao = { contains: search, mode: "insensitive" }`):

```ts
    if (search) Object.assign(where, buildSearchWhere(search))
```

com import `import { buildSearchWhere } from "@/actions/financeiro/shared/search"`.

Em `src/actions/financeiro/receivables/service.ts`, localizar o ponto equivalente (busca: `descricao: { contains: search`) e aplicar a mesma substituição com o mesmo import. A forma é espelhada; se lá o filtro estiver inline num `where`, trocar a propriedade `descricao: ...` por spread do resultado: `...buildSearchWhere(search)`.

- [ ] **Step 6: Coluna de ID nas duas tabelas**

Em `src/app/contas-pagar/_components/ContasPagarPageClient.tsx`:

1. No `<thead>` (busca: `aria-label="Selecionar contas"`), logo APÓS o `<th>` do checkbox, inserir:

```tsx
                                    <th className={cn(operationalListTableHeadCellClass, "w-16")}>ID</th>
```

2. No corpo da linha (busca: `<td className="px-3 py-3.5 text-[#2C201B]">` da célula de vencimento), inserir ANTES dela:

```tsx
                                                <td className="px-3 py-3.5 text-xs font-medium text-[#2C201B]/60">#{item.id}</td>
```

3. Atualizar os três `colSpan={9}` (loading / error / vazio) para `colSpan={10}`.

4. No input de busca (busca: `placeholder=` contendo "Buscar"), atualizar o texto para incluir ID, por exemplo: `"Buscar por descrição ou ID"`.

Espelhar as 4 mudanças em `src/app/contas-receber/_components/ContasReceberPageClient.tsx` (mesma estrutura; conferir o valor atual do `colSpan` lá e somar 1).

- [ ] **Step 7: Validar**

Run: `npm test && npx tsc --noEmit`
Expected: scripts ok, tsc limpo. Manual: buscar `482` ou `#482` encontra a conta 482; coluna ID visível nas duas telas.

- [ ] **Step 8: Commit**

```bash
git add src/actions/financeiro/shared/search.ts src/actions/financeiro/payables/get.ts src/actions/financeiro/receivables/service.ts src/app/contas-pagar/_components/ContasPagarPageClient.tsx src/app/contas-receber/_components/ContasReceberPageClient.tsx scripts/test-search-filter.ts package.json
git commit -m "feat(financeiro): coluna de ID e busca por ID nas contas a pagar e a receber"
```

---

### Task 5: Baixa parcial — aviso explícito sobre o saldo

O diálogo atual ([PaymentModal.tsx, bloco `AlertDialog`]) pergunta "Deseja alterar o valor total...?" com **"Ajustar valor e pagar" como ação primária** — que apaga o saldo restante sem dizer isso. Era para ser um aviso; virou uma armadilha. Inverter a ênfase e nomear a consequência.

**Files:**
- Modify: `src/app/contas-pagar/_components/PaymentModal.tsx`

**Interfaces:**
- Consumes: `submitPayment(ajustarValorTotal: boolean)`, `saldo`, `valor`, `juros`, `descontos`, `formatCurrency` — todos já existem no componente. `calculateAmortizedAmount` vem de `@/lib/financial/money` (adicionar ao import existente).

- [ ] **Step 1: Calcular o restante e trocar o diálogo**

1. No import de `@/lib/financial/money` (busca: `calculateCashPaymentAmount`), acrescentar `calculateAmortizedAmount`.

2. Junto aos `useMemo` existentes (após `valorFinal`):

```tsx
    const saldoRestante = useMemo(
        () => Math.max(0, saldo - calculateAmortizedAmount(valor, juros, descontos)),
        [saldo, valor, juros, descontos]
    )
```

3. Substituir o bloco inteiro do `<AlertDialog ...>` (busca: `Esta conta ficará parcial`) por:

```tsx
            <AlertDialog open={partialConfirmationOpen} onOpenChange={setPartialConfirmationOpen}>
                <AlertDialogContent className="border-[#2C201B]/10 bg-[#FFFCF7]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pagamento parcial</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está baixando {formatCurrency(valor)} de um saldo de {formatCurrency(saldo)}.
                            Ficam {formatCurrency(saldoRestante)} em aberto nesta conta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-[#F1B7B0] text-[#8F3F37] hover:bg-[#FFF4F2]"
                            onClick={() => void submitPayment(true)}
                            disabled={submitting}
                        >
                            Encerrar como paga (abre mão de {formatCurrency(saldoRestante)})
                        </Button>
                        <AlertDialogAction onClick={() => void submitPayment(false)} disabled={submitting}>
                            Deixar {formatCurrency(saldoRestante)} em aberto
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
```

`Button` já é importado no arquivo.

- [ ] **Step 2: Validar**

Run: `npx tsc --noEmit`
Expected: limpo. Manual: baixa menor que o saldo → o diálogo mostra os três números; a ação primária mantém o saldo em aberto; encerrar exige clique na opção que declara o valor perdido.

- [ ] **Step 3: Commit**

```bash
git add src/app/contas-pagar/_components/PaymentModal.tsx
git commit -m "fix(financeiro): baixa parcial deixa saldo em aberto por padrão e nomeia a consequência de encerrar"
```

---

### Task 6: Conta paga editável nos campos seguros (sem estorno)

`canEdit(status)` trava TODOS os campos de conta paga ([financeiro-utils.ts:60](../../../src/lib/financeiro-utils.ts)), e a única saída oferecida é o estorno. Resultado: correção é feita direto no banco. Liberar campos que não mexem em dinheiro (descrição, fornecedor, categoria, centro de custo, observações) com trilha de auditoria; valor e datas continuam protegidos (admin destrava pelo fluxo `adminEditUnlocked` que já existe).

**Files:**
- Modify: `src/actions/financeiro/payables/update.ts`
- Modify: `src/app/api/financeiro/payables/[id]/route.ts`
- Modify: `src/app/contas-pagar/_components/PayableEditorDialog.tsx`
- Test: `scripts/test-payable-safe-edit.ts`

**Interfaces:**
- Produces: `assertLockedEditIsSafe(input, current): void` exportada de `src/actions/financeiro/payables/update.ts` (lança erro se valor/datas mudaram); `updatePayable(id, input, { allowLocked, userId })` ganha `userId` para auditoria.

- [ ] **Step 1: Teste da regra pura**

Criar `scripts/test-payable-safe-edit.ts`:

```ts
import assert from "node:assert/strict"

import { assertLockedEditIsSafe } from "../src/actions/financeiro/payables/update"

const current = {
    valor_total: 3250,
    data_emissao: new Date("2026-07-01T12:00:00.000Z"),
    data_vencimento: new Date("2026-07-20T12:00:00.000Z"),
}

// campos seguros mudando: passa
assert.doesNotThrow(() =>
    assertLockedEditIsSafe(
        { valor: 3250, data_emissao: new Date("2026-07-01T12:00:00.000Z"), data_vencimento: new Date("2026-07-20T12:00:00.000Z") },
        current,
    ),
)

// valor mudou: bloqueia
assert.throws(() =>
    assertLockedEditIsSafe(
        { valor: 3000, data_emissao: new Date("2026-07-01T12:00:00.000Z"), data_vencimento: new Date("2026-07-20T12:00:00.000Z") },
        current,
    ),
)

// data mudou: bloqueia
assert.throws(() =>
    assertLockedEditIsSafe(
        { valor: 3250, data_emissao: new Date("2026-07-02T12:00:00.000Z"), data_vencimento: new Date("2026-07-20T12:00:00.000Z") },
        current,
    ),
)

console.log("payable safe edit rules: ok")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx tsx scripts/test-payable-safe-edit.ts`
Expected: FAIL — `assertLockedEditIsSafe` não existe.

- [ ] **Step 3: Implementar no update.ts**

Em `src/actions/financeiro/payables/update.ts`:

1. Imports adicionais:

```ts
import { fromDateOnlyDb } from "@/lib/date-only"
import { isSameMoneyAmount } from "@/lib/financial/money"
```

2. Exportar a regra pura (antes de `updatePayable`):

```ts
export function assertLockedEditIsSafe(
    input: { valor: number; data_emissao: Date; data_vencimento: Date },
    current: { valor_total: number | { toString(): string }; data_emissao: Date; data_vencimento: Date },
) {
    const lockedFieldChanged =
        !isSameMoneyAmount(input.valor, Number(current.valor_total)) ||
        fromDateOnlyDb(input.data_emissao) !== fromDateOnlyDb(current.data_emissao) ||
        fromDateOnlyDb(input.data_vencimento) !== fromDateOnlyDb(current.data_vencimento)

    if (lockedFieldChanged) {
        throw new Error(
            "Conta paga: valor e datas são protegidos. Ajuste descrição, fornecedor, categoria, centro de custo ou observações — ou peça a um ADMIN para destravar."
        )
    }
}
```

3. Estender o `select` do `findUnique` em `updatePayable` com os campos comparados:

```ts
            valor_total: true,
            data_emissao: true,
            data_vencimento: true,
```

4. Assinatura ganha `userId`:

```ts
export async function updatePayable(
    id: number,
    input: UpdatePayableInput,
    options?: { allowLocked?: boolean; userId?: number }
) {
```

5. Substituir o bloco de trava (busca: `if (isLocked && !options?.allowLocked) {`):

```ts
    const isLocked = payable.status === StatusFinanceiro.PAGO || payable.status === StatusFinanceiro.CANCELADO
    const isSafeLockedEdit = isLocked && !options?.allowLocked
    if (isSafeLockedEdit) {
        if (payable.status === StatusFinanceiro.CANCELADO) {
            throw new Error("Conta cancelada não pode ser editada")
        }
        assertLockedEditIsSafe(input, payable)
    }
```

6. Dentro do `prisma.$transaction`, após o `tx.contaPagar.update`, registrar auditoria quando for edição pós-pagamento:

```ts
        if (isSafeLockedEdit) {
            await tx.auditLog.create({
                data: {
                    user_id: options?.userId ?? null,
                    action: "CONTA_PAGAR_EDITADA_POS_PAGAMENTO",
                    entity: "conta_pagar",
                    entity_id: id,
                    detail: {
                        descricao: input.descricao,
                        fornecedor_id: input.fornecedor_id ?? null,
                        categoria_id: input.categoria_id,
                        centro_custo_id: input.centro_custo_id ?? null,
                    },
                },
            })
        }
```

- [ ] **Step 4: Rodar e ver passar; encadear**

Run: `npx tsx scripts/test-payable-safe-edit.ts`
Expected: `payable safe edit rules: ok`

Em `package.json`, acrescentar à cadeia: `"test:payable-safe-edit": "tsx scripts/test-payable-safe-edit.ts"` e incluir no `"test"`.

- [ ] **Step 5: Passar o userId na rota**

Em `src/app/api/financeiro/payables/[id]/route.ts`, no `PUT` (busca: `const result = await updatePayable(Number(id), input, { allowLocked })`):

```ts
        const userId = Number((session.user as { id?: string | number })?.id) || undefined
        const result = await updatePayable(Number(id), input, { allowLocked, userId })
```

- [ ] **Step 6: Destravar os campos seguros no dialog**

Em `src/app/contas-pagar/_components/PayableEditorDialog.tsx`:

1. Após a linha `const isEditable = ...` (busca: `const isEditable =`), adicionar:

```ts
    const isPaidSafeEdit = Boolean(item) && item!.status === "PAGO" && !isEditable
    const safeEditable = isEditable || isPaidSafeEdit
```

2. Nos campos SEGUROS — Descrição, Fornecedor, Categoria, Centro de custo, Observações — trocar `disabled={!isEditable || submitting}` por `disabled={!safeEditable || submitting}`. Nos campos de DINHEIRO/DATA — Valor total (`MoneyInput`), Data de emissão, Data de vencimento, e os campos de parcelamento — manter `!isEditable`.

3. No guard do submit (busca: `if (!canEdit(item.status)) {` dentro do handler de submit), permitir o caminho seguro:

```ts
        if (!canEdit(item.status) && !isPaidSafeEdit && !(isAdminOrDev && adminEditUnlocked)) {
```

(preservar o corpo atual do bloco).

4. No `isValid` (busca: `if (!isEditable || !descricao.trim()`), trocar `!isEditable` por `!safeEditable`.

5. Abaixo do banner de conta travada (busca: `Edição administrativa desbloqueada`), adicionar o aviso do modo seguro — inserir como irmão, renderizado quando `isPaidSafeEdit`:

```tsx
                        {item && isPaidSafeEdit ? (
                            <p className="rounded-lg border border-[#E8D9BC] bg-[#FFF9EE] px-3 py-2 text-xs text-[#6B5D52]">
                                Conta paga: descrição, fornecedor, categoria, centro de custo e observações podem ser corrigidos (com registro em auditoria). Valor e datas ficam protegidos.
                            </p>
                        ) : null}
```

- [ ] **Step 7: Validar**

Run: `npm test && npx tsc --noEmit`
Expected: scripts ok, tsc limpo. Manual: conta PAGA → corrigir categoria salva e gera AuditLog; tentar mudar o valor pela API responde o erro de proteção; conta CANCELADO segue travada; fluxo admin `adminEditUnlocked` continua liberando tudo.

- [ ] **Step 8: Commit**

```bash
git add src/actions/financeiro/payables/update.ts "src/app/api/financeiro/payables/[id]/route.ts" src/app/contas-pagar/_components/PayableEditorDialog.tsx scripts/test-payable-safe-edit.ts package.json
git commit -m "feat(financeiro): conta paga aceita correção de campos seguros com auditoria"
```

---

### Task 7: Conta a pagar de material nasce com a obra

Hoje só a conta de mão de obra nasce com a obra (`syncObraPayables`, origem única `MAO_DE_OBRA`); madeira/telha/andaime só entram no financeiro quando alguém integra o pedido manualmente — o caso da Monique. Lançar a obra passa a integrar automaticamente cada pedido criado com valor > 0, reutilizando `integrarPedidoCompraAoFinanceiroInTransaction` (que já cria a conta vinculada, resolve categoria e centro de custo e marca o pedido como INTEGRADO). Pedido sem fornecedor não pode bloquear: a exigência vira opcional na origem OBRA (`ContaPagar.fornecedor_id` é nullable).

**Files:**
- Modify: `src/actions/pedido_compra/manage-finance-integration.ts`
- Modify: `src/actions/obras/create-obra-db.ts`

**Interfaces:**
- Consumes: `integrarPedidoCompraAoFinanceiroInTransaction(tx, pedidoId, userId?, origem)` — existente; `syncFixedFinancialCategoryTaxonomy()` — precisa rodar ANTES da transação (faz writes próprios).
- Produces: origem `"OBRA"` aceita no parâmetro `origem`; a função não exige fornecedor nessa origem.

- [ ] **Step 1: Origem OBRA na integração**

Em `src/actions/pedido_compra/manage-finance-integration.ts`:

1. `assertPedidoCanIntegrate` ganha opções (assinatura e o bloco do fornecedor):

```ts
function assertPedidoCanIntegrate(
  pedido: NonNullable<Awaited<ReturnType<typeof buildPedidoIntegrationSnapshot>>>,
  valorPedido: Prisma.Decimal,
  opts: { requireFornecedor?: boolean } = {}
) {
```

e no check do fornecedor:

```ts
  if (opts.requireFornecedor !== false && !pedido.fornecedor_id) {
```

2. `integrarPedidoCompraAoFinanceiroInTransaction`: tipo da origem vira `"MANUAL" | "AUTOMATICA" | "OBRA"`; a chamada do assert passa a opção; a observação ganha o caso OBRA:

```ts
  origem: "MANUAL" | "AUTOMATICA" | "OBRA" = "MANUAL"
```

```ts
  assertPedidoCanIntegrate(pedido, valorPedido, { requireFornecedor: origem !== "OBRA" })
```

```ts
    const observacoes =
      origem === "OBRA"
        ? `Conta gerada automaticamente ao lançar a obra (pedido de compra #${pedido.id}).`
        : origem === "AUTOMATICA"
          ? `Integração financeira automática do pedido de compra #${pedido.id} (status: ${pedido.status}).`
          : `Integração financeira explícita do pedido de compra #${pedido.id}.`
```

- [ ] **Step 2: Integrar na criação da obra**

Em `src/actions/obras/create-obra-db.ts`:

1. Imports no topo:

```ts
import { integrarPedidoCompraAoFinanceiroInTransaction } from "@/actions/pedido_compra/manage-finance-integration"
import { syncFixedFinancialCategoryTaxonomy } from "@/actions/financeiro/categories/sync-fixed-taxonomy"
```

2. IMEDIATAMENTE ANTES do `prisma.$transaction(` da criação da obra, garantir a taxonomia (ela não aceita `tx`):

```ts
  await syncFixedFinancialCategoryTaxonomy()
```

3. Dentro do loop `for (const g of gruposAutomated)`, DEPOIS do loop `for (const it of g.itens)` que insere `pedido_itens` (a integração lê os itens), e ainda dentro do loop do grupo:

```ts
        // Conta a pagar nasce junto com a obra (decisão: sem status novo, direto PENDENTE).
        // Pedido sem valor (ex.: telha não encontrada no orçamento, qty 0) fica de fora —
        // será integrado manualmente quando ganhar itens/valor.
        if (somaTotal > 0) {
          try {
            await integrarPedidoCompraAoFinanceiroInTransaction(tx, pedido.id, input.actorUserId, "OBRA")
          } catch (err) {
            logError("auto-integracao de pedido na criacao da obra falhou", {
              pedidoId: pedido.id,
              categoria: g.categoria,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
```

O `try/catch` é deliberado: falha de integração não pode derrubar a criação da obra — o pedido fica NAO_INTEGRADO e o fluxo manual continua disponível.

4. Verificar que o `select` do orçamento usado nesse arquivo não precisa de mudança (a integração relê o pedido por conta própria via `buildPedidoIntegrationSnapshot`).

- [ ] **Step 3: Notificação pós-commit**

No mesmo arquivo, localizar o trecho pós-transação que notifica as contas criadas pelos syncs (busca: `createdPayableIds`). Coletar também os IDs das contas criadas pela integração: dentro do loop do Step 2, capturar o retorno:

```ts
            const resultado = await integrarPedidoCompraAoFinanceiroInTransaction(tx, pedido.id, input.actorUserId, "OBRA")
            if (resultado.contaPagarId) autoContaIds.push(resultado.contaPagarId)
```

com `const autoContaIds: number[] = []` declarado junto de `createdPayableIds`, e, no ponto pós-commit onde `createdPayableIds` é notificado, incluir `autoContaIds` na mesma iteração (mesma função de notificação, `notifyContaPagarCriadaById`).

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit`
Expected: limpo. Manual (dev + banco local): criar obra a partir de um orçamento com madeira e telha → em `/contas-pagar`, tab "Em aberto", aparecem mão de obra + madeira + telha (+ andaime se houver), com centro de custo da obra e categoria correta; os pedidos correspondentes aparecem como INTEGRADO com `CP #id`; pedido de telha com valor 0 fica NAO_INTEGRADO.

- [ ] **Step 5: Commit**

```bash
git add src/actions/pedido_compra/manage-finance-integration.ts src/actions/obras/create-obra-db.ts
git commit -m "feat(financeiro): contas a pagar de material nascem integradas ao lançar a obra"
```

---

### Task 8: Editar pedido integrado sem estorno (sincroniza a conta não paga)

`editarPedidoCompraComItens` recusa qualquer edição de pedido INTEGRADO ([edit-pedido-compra-db.ts, bloco `PEDIDO_INTEGRADO_FINANCEIRO`]) — é isso que força o ciclo estornar→editar→reintegrar que destrói histórico. Nova regra: se a conta vinculada não tem pagamento, a edição é livre e a conta é atualizada em seguida (valor = itens + frete, vencimento = data de entrega); se tem pagamento, mantém o bloqueio com mensagem que aponta a saída correta (ajustar o valor direto na conta — Task 6/`updatePayable` já permite, mínimo = valor pago).

**Files:**
- Modify: `src/actions/pedido_compra/edit-pedido-compra-db.ts`

**Interfaces:**
- Consumes: `calculatePedidoAmount` e `syncPedidoCompraValorRealizadoInTransaction` de `manage-finance-integration.ts`; `StatusFinanceiro` do Prisma.

- [ ] **Step 1: Ler o arquivo e localizar os dois pontos**

Run: `grep -n "PEDIDO_INTEGRADO_FINANCEIRO\|financeiro_integracao_status\|itens" src/actions/pedido_compra/edit-pedido-compra-db.ts | head -20`

Pontos: (a) o `throw` dentro de `if (existing.financeiro_integracao_status === IntegracaoFinanceiraStatus.INTEGRADO)`; (b) o fim da transação, após itens atualizados.

- [ ] **Step 2: Trocar o bloqueio absoluto pelo condicional**

Substituir o bloco (a) — preservando o tipo de erro que o arquivo já usa com o código `PEDIDO_INTEGRADO_FINANCEIRO` — por:

```ts
      let contaParaSincronizar: { id: number } | null = null
      if (existing.financeiro_integracao_status === IntegracaoFinanceiraStatus.INTEGRADO) {
        const contaAtiva = await tx.contaPagar.findFirst({
          where: { pedido_compra_id: existing.id, status: { not: StatusFinanceiro.CANCELADO } },
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          select: { id: true, valor_pago: true },
        })

        if (contaAtiva && Number(contaAtiva.valor_pago) > 0) {
          throw new PedidoCompraEditError(
            "PEDIDO_INTEGRADO_FINANCEIRO",
            "Este pedido tem pagamentos registrados na conta vinculada. Ajuste o valor diretamente na conta a pagar (o mínimo é o valor já pago), ou estorne os pagamentos antes de editar o pedido.",
            "validate-financial-lock",
            { pedidoCompraId: existing.id, contaPagarId: contaAtiva.id }
          )
        }

        contaParaSincronizar = contaAtiva
      }
```

(ajustar o nome da classe de erro ao que o arquivo realmente usa — é a mesma do `throw` original; adicionar `StatusFinanceiro` ao import do `@prisma/client` se ausente).

- [ ] **Step 3: Sincronizar a conta após atualizar os itens**

No ponto (b), depois que itens e cabeçalho do pedido foram gravados e antes do retorno da transação:

```ts
      if (contaParaSincronizar) {
        const pedidoAtualizado = await tx.pedido_compra.findUniqueOrThrow({
          where: { id: existing.id },
          select: { frete: true, data_entrega: true, fornecedor_id: true, itens: { select: { total: true } } },
        })
        const novoValor = calculatePedidoAmount(pedidoAtualizado)

        await tx.contaPagar.update({
          where: { id: contaParaSincronizar.id },
          data: {
            valor_total: novoValor,
            ...(pedidoAtualizado.data_entrega ? { data_vencimento: pedidoAtualizado.data_entrega } : {}),
            fornecedor_id: pedidoAtualizado.fornecedor_id,
          },
        })
      }
```

com o import `import { calculatePedidoAmount } from "@/actions/pedido_compra/manage-finance-integration"` (verificar import circular: `manage-finance-integration` não importa `edit-pedido-compra-db`, então é seguro).

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit`
Expected: limpo. Manual: editar itens de um pedido integrado sem pagamentos → salva e a conta reflete o novo total; pedido com conta parcialmente paga → erro com a mensagem nova; nenhum estorno gerado em nenhum dos casos.

- [ ] **Step 5: Commit**

```bash
git add src/actions/pedido_compra/edit-pedido-compra-db.ts
git commit -m "feat(pedido): edição de pedido integrado sincroniza a conta não paga em vez de exigir estorno"
```

---

### Task 9: Remover "realizado"/variação da UI do pedido; linkar a conta

Decisão do Edson (crítica de produto aprovada): pedido é logística; o realizado mora na conta e nos relatórios da obra. O trio "Valor do pedido / Valor realizado / Variação" do modal sai; entra o link para a conta vinculada. O card da lista também mostra "Realizado:" — sai. O campo `valor_realizado` continua no banco e nos relatórios (fonte: lançamentos) — só a UI do pedido muda.

**Files:**
- Modify: `src/components/pedido-compra/PedidoCompraSummaryModal.tsx`
- Modify: `src/app/pedido_compra/_components/PedidoCompraPageClient.tsx`

**Interfaces:**
- Consumes: `linkedPayableId` / `linkedPayableStatus` — já derivados no modal.

- [ ] **Step 1: Modal — trio vira valor + conta**

Em `src/components/pedido-compra/PedidoCompraSummaryModal.tsx`:

1. Substituir o bloco do grid de 3 colunas (busca: `Valor realizado`, o `<div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">` inteiro) por:

```tsx
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div>
                <span className="block text-xs text-muted-foreground">Valor do pedido</span>
                <span className="text-lg font-semibold">{formatMoney(displayValorPedido)}</span>
              </div>

              <div className="sm:border-l sm:pl-4">
                <span className="block text-xs text-muted-foreground">Conta a pagar</span>
                {linkedPayableId ? (
                  <Link
                    href={`/contas-pagar?highlight=${linkedPayableId}`}
                    className="text-sm font-semibold underline underline-offset-2"
                  >
                    CP #{linkedPayableId}
                    {linkedPayableStatus ? ` · ${linkedPayableStatus}` : ""}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Não integrado</span>
                )}
              </div>
            </div>
```

2. Remover `const displayRealizado = ...` e `const variance = calcVariance(...)`, a função `calcVariance` e os imports que ficarem órfãos (`TrendingUp`, `TrendingDown`). Garantir `import Link from "next/link"` (adicionar se ausente).

- [ ] **Step 2: Lista — remover Realizado e variação**

Em `src/app/pedido_compra/_components/PedidoCompraPageClient.tsx`:

1. Remover o cálculo de variação do card (busca: linhas com `order.actualValue != null && order.expectedValue` e a expressão `((order.actualValue - order.expectedValue) / order.expectedValue) * 100`) e o bloco JSX que exibe `Realizado:` (busca: `<span className="text-[#7b705f]">Realizado:</span>` — remover o condicional `order.actualValue != null ? (...)` inteiro).

2. Remover `"actualValue"` do tipo `PedidoCompraSortBy`, o ramo `if (sortBy === "actualValue")` do comparador e a menção em `setSortOrder([...])` (busca: `actualValue`). Se houver header/menu de ordenação com rótulo "Realizado", remover a opção.

3. Manter `actualValue` no mapeamento de dados (`mapApiToOrders`) — outros consumidores (`mapOrderToSummaryInitialData`) ainda tipam o campo; apenas a exibição sai. Se o tsc apontar código morto, remover também do map e dos tipos locais.

- [ ] **Step 3: Validar**

Run: `npx tsc --noEmit && npm run lint`
Expected: limpos. Manual: modal do pedido mostra valor + link CP; card da lista sem "Realizado"; clicar no link abre a conta com editor.

- [ ] **Step 4: Commit**

```bash
git add src/components/pedido-compra/PedidoCompraSummaryModal.tsx src/app/pedido_compra/_components/PedidoCompraPageClient.tsx
git commit -m "feat(pedido): UI do pedido deixa de exibir realizado/variação e linka a conta a pagar"
```

---

## Verificação final do plano

- [ ] `npm test` — todos os scripts verdes
- [ ] `npx tsc --noEmit` — limpo
- [ ] `npm run lint` — limpo
- [ ] Roteiro manual completo: criar obra → contas nascem → baixa parcial mantém saldo → editar pedido integrado atualiza conta → orçado vs realizado com datas e links certos → conta paga corrigível sem estorno.
