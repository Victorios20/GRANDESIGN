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
    saldo_atual: number
    ativo: boolean
}

export interface CategoryOption {
    id: number
    nome: string
    tipo: string
    cor: string | null
}

export interface CentroCustoOption {
    id: number
    nome: string
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
}
