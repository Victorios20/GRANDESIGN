import type { StatusFinanceiro, TipoLancamento } from "@prisma/client"

// ── Transaction (Lancamento) type ──

export interface TransactionListItem {
    id: number
    tipo: TipoLancamento
    descricao: string
    valor: number
    data_lancamento: string
    data_competencia: string
    conciliado: boolean
    observacoes: string | null
    conta_bancaria: { id: number; nome: string; banco: string | null; cor: string | null }
    categoria: { id: number; nome: string; cor: string | null; icone: string | null; tipo: string }
    centro_custo: { id: number; nome: string } | null
    conta_pagar: { id: number; descricao: string; fornecedor: { nome: string } | null } | null
    conta_receber: { id: number; descricao: string; cliente: { nome: string } | null } | null
    transferencia: { id: number } | null
    createdBy: { id: number; name: string } | null
    created_at: string
}

// ── List item types (returned from API) ──

export interface PayableListItem {
    id: number
    descricao: string
    valor_total: number
    valor_pago: number
    data_emissao: string
    data_vencimento: string
    data_pagamento: string | null
    status: StatusFinanceiro
    numero_documento: string | null
    observacoes: string | null
    parcela_atual: number
    total_parcelas: number
    recorrente: boolean
    fornecedor: { id: number; nome: string } | null
    categoria: { id: number; nome: string; cor: string | null }
    centro_custo: { id: number; nome: string } | null
    pedido_compra_id: number | null
    created_at: string
}

export interface ReceivableListItem {
    id: number
    descricao: string
    valor_total: number
    valor_recebido: number
    data_emissao: string
    data_vencimento: string
    data_recebimento: string | null
    status: StatusFinanceiro
    numero_documento: string | null
    observacoes: string | null
    parcela_atual: number
    total_parcelas: number
    recorrente: boolean
    cliente: { id: number; nome: string } | null
    categoria: { id: number; nome: string; cor: string | null }
    centro_custo: { id: number; nome: string } | null
    orcamento_id: number | null
    created_at: string
}

// ── Summary ──

export interface FinancialSummary {
    totalAmount: number
    totalPending: number
    overdueCount: number
    overdueAmount: number
    dueTodayCount: number
    dueTodayAmount: number
    dueNext7Count: number
    dueNext7Amount: number
}

// ── Dropdown options ──

export interface BankOption {
    id: number
    nome: string
    tipo: string
    banco?: string | null
    agencia?: string | null
    conta?: string | null
    saldo_inicial?: number
    saldo_atual: number
    cor?: string | null
    ativo: boolean
    transactionCount?: number
    hasTransactions?: boolean
}

export interface CategoryOption {
    id: number
    nome: string
    tipo: string
    cor: string | null
    icone?: string | null
    ativo?: boolean
    categoria_pai_id?: number | null
    categoriaPai?: {
        id: number
        nome: string
    } | null
    subcategorias?: CategoryOption[]
    lancamentosCount?: number
    contasPagarCount?: number
    contasReceberCount?: number
    usageCount?: number
    subcategoriasCount?: number
}

export interface CentroCustoOption {
    id: number
    nome: string
    descricao?: string | null
    ativo?: boolean
    obra_id?: number | null
    obra?: {
        id: number
        titulo: string | null
        endereco_obra: string | null
    } | null
    lancamentosCount?: number
    contasPagarCount?: number
    contasReceberCount?: number
    usageCount?: number
    hasLinkedObra?: boolean
}

// ── Paginated response ──

export interface PaginatedResponse<T> {
    data: T[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

// ── Dashboard ──

export interface UpcomingItem {
    id: number
    descricao: string
    valor_pendente: number
    data_vencimento: string
    tipo: "pagar" | "receber"
    entidade: string | null
    categoria: string
}

export interface DashboardSummary {
    saldo_total: number
    a_receber_30d: number
    a_pagar_30d: number
    projecao_30d: number
    entradas_saidas_12m: { month: string; receitas: number; despesas: number }[]
    top_categorias_mes: { nome: string; cor: string | null; total: number; tipo: string }[]
    proximos_vencimentos: UpcomingItem[]
    vencidas: UpcomingItem[]
    operational_result?: OperationalResult
}

// ── Reports ──

export interface MonthlyTrendItem {
    month: string
    receitas: number
    despesas: number
    resultado: number
}

export interface OperationalResult {
    periodo: {
        start: string
        end: string
    }
    receitas_totais: number
    custos_despesas_totais: number
    resultado_operacional: number
    margem_operacional: number | null

    previous?: {
        periodo: {
            start: string
            end: string
        }
        receitas_totais: number
        custos_despesas_totais: number
        resultado_operacional: number
        margem_operacional: number | null
        variacao_receitas: number | null
        variacao_despesas: number | null
        variacao_resultado: number | null
    }

    trend_6m: MonthlyTrendItem[]
}

export interface BalanceteItem {
    categoria_id: number
    nome: string
    nivel: 1 | 2
    tipo: string // 'Receita' | 'Despesa'

    saldo_anterior: number
    debitos: number
    creditos: number
    saldo_final: number

    // For UI expansion
    subcontas: BalanceteItem[]
}

// ── Cash Flow ──

export type CashFlowDayStatus = "SAUDAVEL" | "ATENCAO" | "CRITICO"

export interface CashFlowProjectionItem {
    date: string
    saldo_inicial: number
    entradas_previstas: number
    saidas_previstas: number
    saldo_dia: number
    saldo_final: number
    status: CashFlowDayStatus
}

export type CashFlowScopeMode =
    | "preset_7"
    | "preset_14"
    | "preset_28"
    | "preset_30"
    | "preset_60"
    | "preset_90"
    | "all_open"
    | "custom_range"

export interface CashFlowProjectionScope {
    mode: CashFlowScopeMode
    label: string
    period_start: string
    period_end: string
    days: number
    last_open_due_date: string | null
}

export interface CashFlowProjectionSummary {
    saldo_atual: number
    entradas_previstas: number
    saidas_previstas: number
    saldo_final_previsto: number
    pior_saldo: number
    data_pior_saldo: string | null
    pico_caixa: number
    data_pico_caixa: string | null
}

export interface CashFlowAnalyticsPoint {
    date: string | null
    value: number
}

export interface CashFlowProjectionAnalytics {
    worst_day: CashFlowAnalyticsPoint
    best_day: CashFlowAnalyticsPoint
    biggest_inflow_day: CashFlowAnalyticsPoint
    biggest_outflow_day: CashFlowAnalyticsPoint
    critical_days_count: number
    attention_days_count: number
    healthy_days_count: number
}

export interface CashFlowSettings {
    safety_limit: number
}

export interface CashFlowExcludedTransfersSummary {
    entradas: number
    saidas: number
    quantidade: number
}

export interface CashFlowOutsideScopeSummary {
    entradas_antes: number
    saidas_antes: number
    entradas_depois: number
    saidas_depois: number
    total_entradas: number
    total_saidas: number
    has_values: boolean
}

export interface CashFlowProjectionResponse {
    safety_limit: number
    scope: CashFlowProjectionScope
    summary: CashFlowProjectionSummary
    analytics: CashFlowProjectionAnalytics
    excluded_internal_transfers: CashFlowExcludedTransfersSummary
    outside_scope: CashFlowOutsideScopeSummary
    projection: CashFlowProjectionItem[]
}
