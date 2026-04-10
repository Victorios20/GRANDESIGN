import type { ConferenciaStatus, StatusConferencia, StatusFinanceiro, TipoLancamento } from "@prisma/client"

// ── Transaction (Lancamento) type ──

export interface TransactionListItem {
    id: number
    tipo: TipoLancamento
    descricao: string
    valor: number
    data_lancamento: string
    data_competencia: string
    conciliado: boolean
    status_conferencia: StatusConferencia
    pendencia_motivo: string | null
    conferencia_sessao_id: number | null
    observacoes: string | null
    conta_bancaria: { id: number; nome: string; banco: string | null; cor: string | null }
    categoria: { id: number; nome: string; cor: string | null; icone: string | null; tipo: string }
    centro_custo: { id: number; nome: string } | null
    conta_pagar: { id: number; descricao: string; fornecedor: { nome: string } | null } | null
    conta_receber: { id: number; descricao: string; cliente: { nome: string } | null } | null
    transferencia: { id: number } | null
    conferencia_sessoes: {
        id: number
        status: ConferenciaStatus
        periodo_inicio: string
        periodo_fim: string
    } | null
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
    pedido_compra: {
        id: number
        obra_id: number
        descricao: string | null
    } | null
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
    filterCount: number
    filterOpenAmount: number
    statusCounts: Record<"todos" | StatusFinanceiro, number>
    totalAmount: number
    totalPending: number
    overdueCount: number
    overdueAmount: number
    dueTodayCount: number
    dueTodayAmount: number
    dueNext7Count: number
    dueNext7Amount: number
}

export interface TransactionSummary {
    incomeAmount: number
    expenseAmount: number
    netAmount: number
    reconciledCount: number
    totalCount: number
}

export interface ConferenceSessionSummary {
    id: number
    conta_bancaria_id: number | null
    conta_bancaria_nome: string | null
    criada_em: string
    concluida_em: string | null
    periodo_inicio: string
    periodo_fim: string
    status: ConferenciaStatus
    qtd_conferidas: number
    qtd_pendencias: number
    total_lancamentos: number
    remainingCount: number
    snapshot_total: number
    reviewed_count: number
    pending_issue_count: number
    not_reviewed_count: number
    new_pending_after_open_count: number
    account_backlog_total: number
    total_conferido: number
    nota: string | null
    reopen_reason: string | null
}

export interface ConferenceAccountContext {
    conta_bancaria_id: number
    conta_bancaria_nome: string
    saldo_atual: number
    account_backlog_total: number
    active_session: ConferenceSessionSummary | null
    latest_closed_session: ConferenceSessionSummary | null
}

export type ConferenceSessionHistoryItem = ConferenceSessionSummary

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

export interface SupplierOption {
    id: number
    nome: string
    tipo: string | null
}

export interface ClientOption {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
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

export type DashboardPeriodPreset =
    | "today"
    | "yesterday"
    | "last7"
    | "last30"
    | "thisMonth"
    | "lastMonth"
    | "thisYear"
    | "last3Months"
    | "custom"

export type DashboardAnalysisStatus = "realizado" | "previsto" | "ambos"
export type DashboardExpenseScope = "expense" | "cost"

export type DashboardChartWindowPreset = "thisMonth" | "30d" | "3m" | "6m" | "12m"

export interface DashboardHeaderContext {
    title: string
    subtitle: string
}

export interface DashboardAppliedFilters {
    period_preset: DashboardPeriodPreset
    period_start: string
    period_end: string
    period_label: string
    account_ids: number[]
    analysis_status: DashboardAnalysisStatus
}

export interface DashboardKpiComparison {
    label: string
    value: number
}

export interface DashboardKpiMetric {
    label: string
    microcopy?: string
    value: number
    anchor_label: string
    comparison?: DashboardKpiComparison | null
}

export interface DashboardEvolutionPoint {
    bucket_key: string
    label: string
    start: string
    end: string
    receitas: number
    despesas: number
    resultado: number
    saldo_acumulado: number
    is_current: boolean
}

export interface DashboardTopExpenseItem {
    categoria_id: number
    nome: string
    cor: string | null
    total: number
    percentual_total: number
    lancamentos_count: number
}

export interface DashboardAlert {
    id: string
    priority: number
    tone: "critical" | "warning" | "info"
    title: string
    description: string
    cta_label?: string | null
    cta_href?: string | null
}

export interface UpcomingItem {
    id: number
    descricao: string
    valor_pendente: number
    data_vencimento: string
    tipo: "pagar" | "receber"
    entidade: string | null
    categoria: string
    urgency: "overdue" | "today" | "tomorrow" | "upcoming"
    badge_label: string
    account_name?: string | null
    route_href?: string | null
}

export interface DashboardCashAccountItem {
    id: number
    nome: string
    tipo: string
    banco: string | null
    saldo_atual: number
}

export interface DashboardSummary {
    header_context: DashboardHeaderContext
    filters_applied: DashboardAppliedFilters
    kpis: {
        saldo_disponivel: DashboardKpiMetric
        resultado_periodo: DashboardKpiMetric
        saidas_previstas: DashboardKpiMetric
        saldo_projetado: DashboardKpiMetric
    }
    evolution: {
        title: string
        subtitle: string
        window_preset?: DashboardChartWindowPreset
        range_label?: string
        resolution: "day" | "month"
        summary: {
            receitas: number
            despesas: number
            resultado: number
            saldo_acumulado: number
        }
        points: DashboardEvolutionPoint[]
    }
    top_expenses: {
        title: string
        subtitle: string
        scope: DashboardExpenseScope
        total_despesas: number
        items: DashboardTopExpenseItem[]
    }
    alerts?: {
        title: string
        subtitle: string
        items: DashboardAlert[]
    }
    upcoming_payables: {
        title: string
        subtitle: string
        items: UpcomingItem[]
    }
    upcoming_receivables: {
        title: string
        subtitle: string
        items: UpcomingItem[]
    }
    cash_composition: {
        title: string
        subtitle: string
        total: number
        items: DashboardCashAccountItem[]
    }
}

export interface DashboardDetailListItem {
    id: number
    title: string
    subtitle: string
    amount: number
    date: string
    source: "realizado" | "previsto"
    tone: "positive" | "negative" | "neutral"
    href: string
}

export interface DashboardPeriodDetail {
    title: string
    subtitle: string
    period_label: string
    summary: {
        receitas: number
        despesas: number
        resultado: number
    }
    items: DashboardDetailListItem[]
    cta_label: string
    cta_href: string
}

export interface DashboardExpenseSupplierBreakdownItem {
    supplier_id: number | null
    nome: string
    total: number
    lancamentos_count: number
    href: string
}

export interface DashboardExpenseCategoryDetail {
    title: string
    subtitle: string
    scope: DashboardExpenseScope
    category: {
        categoria_id: number
        nome: string
        total: number
        percentual_total: number
    }
    suppliers: DashboardExpenseSupplierBreakdownItem[]
    latest_items: DashboardDetailListItem[]
    cta_label: string
    cta_href: string
}

export interface DashboardEntryDetail {
    title: string
    subtitle: string
    amount: number
    due_date: string
    badge_label: string
    category: string
    entity: string | null
    description: string
    notes: string | null
    cta_label: string
    cta_href: string
}

export interface DashboardCashDetail {
    title: string
    subtitle: string
    total: number
    accounts: DashboardCashAccountItem[]
    latest_movements: DashboardDetailListItem[]
    cta_label: string
    cta_href: string
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
    closing_date: string | null
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
