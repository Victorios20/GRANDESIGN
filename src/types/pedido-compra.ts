/**
 * Pedido de Compra - Centralized Type Definitions
 * 
 * All types related to purchase orders.
 * Import from here instead of redefining in each component.
 */

// ═══════════════════════════════════════════════════════════
// ENUMS & BASIC TYPES
// ═══════════════════════════════════════════════════════════

export type PedidoCategoria = "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES" | "ANDAIME"

export type PedidoStatus =
    | "RASCUNHO"
    | "PENDENTE"
    | "APROVADO"
    | "EM_COMPRA"
    | "AGUARDANDO_PAGAMENTO"
    | "AGUARDANDO_ENTREGA"
    | "ENTREGUE"
    | "CANCELADO"

export type PurchaseOrderStatusSlug =
    | "todos"
    | "rascunho"
    | "pendente"
    | "aprovado"
    | "em-compra"
    | "aguardando-pagamento"
    | "aguardando-entrega"
    | "entregue"
    | "cancelado"

export type PurchaseOrderCategoryLabel = "Telha" | "Madeira" | "Materiais" | "Andaimes" | "Andaime"

// ═══════════════════════════════════════════════════════════
// ENTITY TYPES
// ═══════════════════════════════════════════════════════════

export interface FornecedorOption {
    id: number
    nome: string
}

export interface FornecedorItem extends FornecedorOption {
    tipo: string | null
}

export interface ObraSearchItem {
    id: number
    titulo: string | null
    nomeReceptor: string | null
    telefoneReceptor: string | null
    enderecoEntrega: string | null
    linkMaps: string | null
}

// ═══════════════════════════════════════════════════════════
// LIST ITEM (from API)
// ═══════════════════════════════════════════════════════════

export interface PedidoCompraListItem {
    id: number
    descricao: string | null
    categoria: PedidoCategoria
    status: PedidoStatus
    valor_orcado: string | number | null
    valor_realizado: string | number | null
    data_entrega: string | null
    fornecedor: { id: number; nome: string } | null
    obra_id: number
    obra_status: string | null
    obra_titulo: string | null
    obra_cidade: string | null
    created_at: string
}

export interface ListarResult {
    items: PedidoCompraListItem[]
    page: number
    pageSize: number
    total: number
    totalPages: number
}

// ═══════════════════════════════════════════════════════════
// UI VIEW MODEL
// ═══════════════════════════════════════════════════════════

export interface PurchaseOrder {
    id: string
    number: string
    description: string
    category: PurchaseOrderCategoryLabel
    supplier: string
    supplierId: number | null
    project: string
    obraId: number
    obraStatus: string | null
    obraTitulo: string | null
    obraCidade: string | null
    expectedValue: number
    actualValue?: number
    deliveryDate: string | null
    status: PurchaseOrderStatusSlug
    integrated: boolean
    integratedCode?: string
    viewed?: boolean
    createdAt: string
}

// ═══════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════

export interface OrderItem {
    id?: number
    clientId: string
    descricao: string
    quantidade: number
    precoUnitario: number
    total: number
    tamanho?: number | null
    componente?: string | null
}

export interface DeliveryAddress {
    nomeReceptor: string
    telefoneReceptor: string
    enderecoEntrega: string
    linkMaps: string
}

export interface PedidoFormData {
    obraId: string
    categoria: PedidoCategoria | ""
    fornecedorId: string
    descricao: string
    valorOrcado: string
    valorRealizado: string
    dataEntrega: string
    status: PedidoStatus
    frete: string
    observacoes: string
}

// ═══════════════════════════════════════════════════════════
// MATERIAL TYPES
// ═══════════════════════════════════════════════════════════

export interface MaterialDTO {
    id: number
    descricao: string
    tipo: string
    preco_unitario: number
    unidade_de_medida: string
    fornecedorId: number | null
}

export interface MateriaisByTipo {
    madeira: MaterialDTO[]
    telha: MaterialDTO[]
    geral: MaterialDTO[]
    andaime: MaterialDTO[]
}

export const emptyMateriaisByTipo: MateriaisByTipo = {
    madeira: [],
    telha: [],
    geral: [],
    andaime: [],
}

// ═══════════════════════════════════════════════════════════
// API RESPONSE TYPES (DETAILS)
// ═══════════════════════════════════════════════════════════

export interface PedidoCompraDetalhadoSnake {
    id: number
    obra_id: number
    obra?: { titulo: string | null } | null
    categoria: PedidoCategoria
    status: PedidoStatus
    valor_orcado: string | null
    valor_realizado: string | null
    frete: string | null
    descricao: string | null
    observacoes: string | null
    fornecedor_id: number | null
    data_entrega: string | null
    endereco_entrega: string | null
    nome_receptor: string | null
    telefone_receptor: string | null
    link_maps: string | null
    fornecedor: { id: number; nome: string; tipo: string | null } | null
    itens: Array<{
        id: number
        pedido_compra_id: number
        descricao: string
        quantidade: string
        tamanho: string | null
        preco_unitario: number | string
        total: number | string
        componente: string | null
    }>
}
