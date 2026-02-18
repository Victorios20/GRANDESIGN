// src/components/orcamento/OrcamentoPage.tsx
"use client"

import { useState, useEffect, useMemo, ChangeEvent, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    Trash,
    Edit,
    Save,
    Calculator,
    Loader2,
    RotateCcw,
    Eye,
    EyeOff,
    ArrowUpRight,
    Copy,
    ChevronsUpDown,
} from "lucide-react"

import DadosPessoaisCard from "./DadosPessoaisCard"
import { FATOR_10X, FATOR_18X } from "@/app/orcamento/_utils/fatoresCartao"

import { Toaster, toast } from "sonner"

import { calcularMateriais } from "@/actions/calcular-materiais/calcularMateriais"
import type { MaterialCalculado } from "@/actions/calcular-materiais/calcularMateriais"

import CopyLinkButton from "@/components/ui/CopyLinkButton"

import { calcularTotais } from "@/actions/calculo_totais/calculo_totais"
import { gerarPDF, GerarPDFError } from "@/api/useGerarPDF"
import { logOrcamentoWebhook } from "@/api/useLogWebhook"

import ClienteModal from "@/components/modals/ClienteModal"
import type { UpdateOrcamentoInput } from "@/actions/edit-orcamento-db/edit-orcamento-db"

import { PageLayout } from "@/components/ui/pageLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    Command,
    CommandList,
    CommandItem,
    CommandEmpty,
    CommandGroup,
} from "@/components/ui/command"


import ModalSucessoProposta from "@/components/modals/ModalSucessoProposta"

import { aplicarFreteTelhasPorCidade } from "@/lib/regra-frete-telhas"

// ===========================================
//               CONSTANTES TELHAS
// ===========================================
const GRUPO_NATURAIS = ["super romana vermelha", "colonial", "americana vermelha"]
const GRUPO_RESINADAS = ["maxxi", "romana marfim", "americana marfim"]

type TileGroup = "naturais" | "resinadas" | null

function getTileGroup(nome: string): TileGroup {
    const n = nome.toLowerCase().trim()
    if (GRUPO_NATURAIS.some(x => n.includes(x))) return "naturais"
    if (GRUPO_RESINADAS.some(x => n.includes(x))) return "resinadas"
    return null
}

const GROUP_CONFIG = {
    naturais: { color: "bg-red-600", label: "Vermelha" },
    resinadas: { color: "bg-[#FFFFF0] border border-gray-300", label: "Marfim" }, // Ivory-ish
}


export type Material = {
    id: number
    nome: string
    componente: string
    quantidade: number
    preco: number
    tamanho?: string | number
    frete?: number
}

type Categoria = "madeiras" | "materiaisGerais" | "telhas"

type MateriaisPorCategoria = {
    madeiras: Material[]
    materiaisGerais: Material[]
    telhas: Material[]
}
type TipoObra = { id: number; tipo_obra: string }

type Cidade = { id: number; nome: string }

type Dim = {
    largura: number
    comprimento: number
    larguraMaior: number
    larguraMenor: number
    comprimentoMaior: number
    comprimentoMenor: number
}

type Componente = { id: number; nome: string }
type Fornecedor = { id: number; nome: string; tipo?: string | null }

type LinksState = { slide?: string; pdf?: string }
type ClienteSearchResult = {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
    cidade_id: number | null
    cidade_nome: string | null
    cpf: string | null
}

export type InitialData = {
    id: number
    clienteId: number
    titulo: string
    cliente: { nome: string; telefone: string; bairro: string; cidade: string }
    parametros: {
        tipoObra: string
        largura?: number | null
        comprimento?: number | null
        larguraMaior?: number | null
        larguraMenor?: number | null
        comprimentoMaior?: number | null
        comprimentoMenor?: number | null
    }
    materiais: MateriaisPorCategoria
    totais: {
        madeiras: number
        materiais: number
        comissao: number
        frete: number
        empresaPS: number
        empresaGD: number
    }
    telhaValores: Record<string, Pagto>
    links: { slide?: string; pdf?: string; slideUrl?: string | null; pdfUrl?: string | null }

    fornecedorId?: number | null
    fornecedorNome?: string | null
    observacoes?: string | null
}



type Catalogo = {
    madeiras: { nome: string; preco: number }[]
    materiaisGerais: { nome: string; preco: number }[]
    telhas: { nome: string; preco: number }[]
}


type BaseProps = {

    catalogo: Catalogo
    componentes: Componente[]
    tiposObra: TipoObra[]
    cidades: Cidade[]
}

type CreateProps = BaseProps & {
    mode?: "create"
}


type EditProps = BaseProps & {
    mode: "edit"
    orcamentoId: number
    initialData: InitialData
}

type OrcamentoPageProps = CreateProps | EditProps


/* ===================================================================
 *                              Helpers
 * =================================================================== */

type ApiErrorShape = {
    error: string
    code?: string
    step?: string
    details?: any
    requestId?: string
}

type Pagto = { pix: number; x10: number; x18: number }
type TotaisPayload = { madeiras: number; materiais: number; comissao: number; frete: number; empresaPS: number; empresaGD: number }

type SalvarPayload = {
    clienteId?: number

    cliente: { nome: string; telefone: string; bairro: string; cidade?: string | null }

    parametros: {
        tipoObra: string
        largura?: number | null
        comprimento?: number | null
        larguraMaior?: number | null
        larguraMenor?: number | null
        comprimentoMaior?: number | null
        comprimentoMenor?: number | null
    }
    materiais: {
        madeiras: {
            nome: string
            componente?: string
            quantidade: number
            preco: number
            tamanho?: number | string | null | undefined
            frete?: number | null | undefined
        }[]
        materiaisGerais: { nome: string; quantidade: number; preco: number }[]
        telhas: { nome: string; quantidade: number; preco: number; frete?: number | null | undefined }[]
    }
    totais: TotaisPayload
    telhaValores: Record<string, Pagto>
    links?: { slideUrl: string | null; pdfUrl: string | null }
    titulo: string
    observacoes?: string | null
    fornecedorId?: number | null // NEW
}

async function postJSON<T>(url: string, data: unknown): Promise<T> {
    const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(data),
    })

    const isJson = r.headers.get("content-type")?.includes("application/json")

    if (!r.ok) {
        let msg = `Falha ao salvar (${r.status})`
        if (isJson) {
            try {
                const j = (await r.json()) as ApiErrorShape
                if (j?.error) msg = j.error
                console.error("[API ERROR]", { url, status: r.status, ...j })
            } catch { }
        } else {
            try { msg = `Falha ao salvar (${r.status}): ${(await r.text()) || "Erro"}` } catch { }
        }
        throw new Error(msg)
    }

    return (isJson ? r.json() : (null as unknown)) as Promise<T>
}


async function putJSON<T>(url: string, data: unknown): Promise<T> {
    const r = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(data),
    })

    const isJson = r.headers.get("content-type")?.includes("application/json")

    if (!r.ok) {
        let extra = ""
        if (isJson) {
            try {
                const j = (await r.json()) as ApiErrorShape
                const parts = [
                    j?.error,
                    j?.code ? `(${j.code})` : "",
                    j?.step ? `@${j.step}` : "",
                    j?.requestId ? `id:${j.requestId}` : "",
                ].filter(Boolean)
                extra = parts.length ? `: ${parts.join(" ")}` : ""
                console.error("[API ERROR]", { url, status: r.status, ...j })
            } catch { }
        } else {
            try { extra = `: ${await r.text()}` } catch { }
        }
        throw new Error(`Falha ao salvar (${r.status})${extra}`)
    }

    return (isJson ? r.json() : (null as unknown)) as Promise<T>
}

async function getFornecedores(): Promise<Fornecedor[]> {
    const r = await fetch("/api/fornecedores", { cache: "no-store" })
    if (!r.ok) throw new Error("Falha ao listar fornecedores")
    return r.json()
}

async function getMadeirasByFornecedor(fornecedorId: number): Promise<Array<{ nome: string; preco: number }>> {
    const r = await fetch(`/api/materiais?fornecedorId=${fornecedorId}`, { cache: "no-store" })
    if (!r.ok) throw new Error("Falha ao listar madeiras do fornecedor")
    const rows: Array<{ id: number; descricao: string; preco_unitario: number }> = await r.json()
    return rows
        .map(r => ({ nome: r.descricao, preco: Number(r.preco_unitario ?? 0) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
}
const ORCAMENTOS_ENDPOINT = "/api/Orcamentos"

const updateOrcamentoAPI = (id: number, payload: UpdateOrcamentoInput) =>
    putJSON<{ ok: true }>(`${ORCAMENTOS_ENDPOINT}/${id}`, payload).then(() => true)

const salvarOrcamentoAPI = (payload: SalvarPayload) =>
    postJSON<{ id: number }>(ORCAMENTOS_ENDPOINT, payload).then(r => r.id)

const salvarRascunhoAPI = (payload: SalvarPayload) =>
    postJSON<{ id: number }>(`${ORCAMENTOS_ENDPOINT}/rascunho`, payload).then(r => r.id)

const gerarPropostaAPI = (payload: SalvarPayload) =>
    postJSON<{ id: number; links: { slideUrl: string; pdfUrl: string }; requestId?: string }>(
        `${ORCAMENTOS_ENDPOINT}/gerar-proposta`,
        payload
    )

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function buscarClientes(by: "name" | "phone", q: string, limit = 10): Promise<ClienteSearchResult[]> {
    const url = `/api/clientes/search?by=${by}&q=${encodeURIComponent(q)}&limit=${limit}`
    const r = await fetch(url, { cache: "no-store" })
    if (!r.ok) throw new Error("Falha na busca de clientes")
    return r.json()
}


async function findClienteByNomeExato(nome: string): Promise<ClienteSearchResult | null> {
    const list = await buscarClientes("name", nome, 10)
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")
    const alvo = norm(nome)
    return list.find(c => norm(c.nome ?? "") === alvo) ?? null
}

async function criarOuAssociarCliente(
    form: { nome: string; telefone: string; bairro: string; cidade: string },
    cidades: { id: number; nome: string }[],
): Promise<{ id: number; associado: boolean }> {
    const nome = form.nome.trim()
    if (!nome) throw new Error("Informe o nome do cliente.")
    const cidadeId = cidades.find(c => c.nome === form.cidade)?.id ?? null
    const telefoneRaw = form.telefone?.replace(/\D/g, "") || null
    const bairro = form.bairro?.trim() || null

    const r = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone: telefoneRaw, bairro, cidade_id: cidadeId }),
    })

    if (r.status === 201) {
        const j = await r.json()
        return { id: Number(j?.id), associado: false }
    }

    if (r.status === 409) {

        const encontrado = await findClienteByNomeExato(nome)
        if (encontrado?.id) return { id: encontrado.id, associado: true }


        try {
            const j = await r.json()
            if (j?.id) return { id: Number(j.id), associado: true }
        } catch { }

        throw new Error("Cliente já existe.")
    }

    let msg = `Falha ao cadastrar cliente (${r.status})`
    try {
        const j = await r.json()
        if (j?.error) msg = j.error
    } catch { }
    throw new Error(msg)
}

async function editarCliente(
    id: number,
    form: { nome: string; telefone: string; bairro: string; cidade: string },
    cidades: { id: number; nome: string }[],
): Promise<{ id: number }> {
    const nome = form.nome.trim()
    if (!nome) throw new Error("Informe o nome do cliente.")
    const cidadeId = cidades.find(c => c.nome === form.cidade)?.id ?? null
    const telefoneRaw = form.telefone?.replace(/\D/g, "") || null
    const bairro = form.bairro?.trim() || null

    const r = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone: telefoneRaw, bairro, cidade_id: cidadeId }),
    })

    if (r.status === 200) {
        const j = await r.json()
        return { id: Number(j?.id ?? id) }
    }

    if (r.status === 409) {
        let msg = "Já existe cliente com este nome."
        try {
            const j = await r.json()
            msg = j?.error || msg
        } catch { }
        throw new Error(msg)
    }

    let msg = `Falha ao atualizar cliente (${r.status})`
    try {
        const j = await r.json()
        if (j?.error) msg = j.error
    } catch { }
    throw new Error(msg)
}



const TIPO_OBRA_STYLE_BY_ID: Record<number, { item: string; trigger: string }> = {
    9: { // Caramanchão de 15 → amarelo suave
        item: "bg-yellow-400/30 hover:bg-yellow-400/40 data-[highlighted]:bg-yellow-400/40 data-[state=checked]:bg-yellow-400/50",
        trigger: "bg-yellow-400/30",
    },
    5: { // Linha na parede de 15
        item: "bg-sky-600/30 hover:bg-sky-600/40 data-[highlighted]:bg-sky-600/40 data-[state=checked]:bg-sky-600/50",
        trigger: "bg-sky-600/30",
    },
    3: { // Pontalete de 15
        item: "bg-emerald-600/30 hover:bg-emerald-600/40 data-[highlighted]:bg-emerald-600/40 data-[state=checked]:bg-emerald-600/50",
        trigger: "bg-emerald-600/30",
    },
    13: { // Cobertura em L
        item: "bg-pink-600/30 hover:bg-pink-600/40 data-[highlighted]:bg-pink-600/40 data-[state=checked]:bg-pink-600/50",
        trigger: "bg-pink-600/30",
    },
}

const styleForItemId = (id: number) => TIPO_OBRA_STYLE_BY_ID[id]?.item ?? ""
const styleForTriggerId = (id?: number | null) =>
    id ? TIPO_OBRA_STYLE_BY_ID[id]?.trigger ?? "" : ""




const FIELD_IDS = {
    nome: "inp-nome",
    telefone: "inp-telefone",
    cidade: "inp-cidade",
    bairro: "inp-bairro",
    tipoObra: "inp-tipo-obra",
    madeiras: "tbl-madeiras",
    cadastrarCliente: "btn-cadastrar-cliente",
} as const
type FieldKey = keyof typeof FIELD_IDS


const scrollToField = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
        ; (el as HTMLInputElement).focus?.()
    el.classList.add("ring", "ring-amber-400", "ring-offset-2")
    setTimeout(() => el.classList.remove("ring", "ring-amber-400", "ring-offset-2"), 1600)
}

type ValidateResult = { ok: true } | { ok: false; missing: FieldKey; msg: string }

const validateCalcular = (
    _form: { nome: string; telefone: string; cidade?: string | null; bairro?: string | null },
    tipoObra: string | null,
    isCobertaL: boolean,
    dim: Dim,
): ValidateResult => {
    if (!tipoObra?.trim()) return { ok: false, missing: "tipoObra", msg: "Selecione o tipo de obra para calcular." }

    if (isCobertaL) {
        if (!dim.larguraMaior || !dim.comprimentoMaior || !dim.larguraMenor || !dim.comprimentoMenor) {
            return { ok: false, missing: "tipoObra", msg: "Informe Largura/Comprimento MAIOR e MENOR para Coberta em L." }
        }
    } else {
        if (!dim.largura || !dim.comprimento) {
            return { ok: false, missing: "tipoObra", msg: "Informe largura e comprimento para calcular." }
        }
    }

    return { ok: true }
}


// validar pré-modal de Gerar Proposta (Etapa 1 + Etapa 2)
const validatePreGerar = (
    form: { nome: string; telefone: string; cidade?: string | null; bairro?: string | null },
    tipoObra: string | null,
    materiais: { madeiras: any[] },
): ValidateResult => {
    if (!form.nome?.trim()) return { ok: false, missing: "nome", msg: "Preencha o nome do cliente." }
    if (!form.telefone?.trim()) return { ok: false, missing: "telefone", msg: "Informe o telefone do cliente." }
    if (!form.cidade?.trim()) return { ok: false, missing: "cidade", msg: "Selecione a cidade do cliente." }
    if (!form.bairro?.trim()) return { ok: false, missing: "bairro", msg: "Informe o bairro do cliente." }
    if (!tipoObra?.trim()) return { ok: false, missing: "tipoObra", msg: "Selecione o tipo de obra." }
    if (!materiais.madeiras?.length)
        return { ok: false, missing: "madeiras", msg: "Adicione ao menos uma madeira." }
    return { ok: true }
}

const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()

const normalizeHuman = (s: string) =>
    normalize(s)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "") // remove acentos

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const formatBR = (v: number) => BRL.format(Number.isFinite(v) ? v : 0)

// De número -> string editável (sem milhar, com vírgula decimal)
const toEditable = (n: number): string => {
    if (!Number.isFinite(n)) return ""
    // 2 casas, vírgula como decimal
    return n.toFixed(2).replace(".", ",")
}

// De string editável -> número (aceita só dígitos e vírgula)
const parseEditable = (s: string): number => {
    if (!s) return 0
    const only = s.replace(/[^\d,]/g, "")      // mantém dígitos e vírgula
    const normalized = only.replace(",", ".")  // troca vírgula por ponto
    const n = Number(normalized)
    return Number.isFinite(n) ? n : 0
}


const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11)
    if (d.length <= 2) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const toPos = (s?: string | number): number => {
    if (typeof s === "number") return Math.max(0, s)
    if (s == null || s === "") return 0
    const n = parseFloat(String(s).replace(",", "."))
    return Number.isFinite(n) ? Math.max(0, n) : 0
}



const calcTelhaValores = (
    telhasArr: {
        id: number
        nome: string
        componente: string
        quantidade: number
        preco: number
        tamanho?: string | number
        frete?: number
    }[],
    totalGeral: number,
): Record<string, Pagto> => {
    // Soma “extra” por NOME exato da telha (Etapa 2)
    const grupos = new Map<string, number>()
    for (const t of telhasArr) {
        const nome = (t.nome ?? "").trim()
        if (!nome) continue
        const extra = (t.quantidade * t.preco) + (t.frete ?? 0)
        grupos.set(nome, (grupos.get(nome) ?? 0) + extra)
    }

    const make = (extra: number): Pagto => {
        const base = totalGeral + extra
        const pix = Math.ceil(base / 100) * 100
        return {
            pix,
            x10: Math.ceil((pix * FATOR_10X) / 10),
            x18: Math.ceil((pix * FATOR_18X) / 18),
        }
    }

    const out: Record<string, Pagto> = {}
        ;[...grupos.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
            .forEach(([nome, extra]) => {
                out[nome] = make(extra)
            })
    return out
}



/* ===================================================================
 *                            Componente
 * =================================================================== */
export default function OrcamentoPage(props: OrcamentoPageProps) {

    const router = useRouter()

    const { data: session } = useSession()
    const currentUserId = session?.user?.id ? Number(session.user.id) : -1

    const usuarioLog = {
        id: session?.user?.id ?? null,
        nome: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
    }


    const isEdit = props.mode === "edit"

    // props comuns (existem em ambos os ramos)
    const {
        catalogo: catalogoProp,
        componentes: componentesProp,
        tiposObra: tiposObraProp,
        cidades: cidadesProp,
    } = props

    // somente no edit — agora com narrowing do TypeScript
    let orcamentoId: number | undefined
    let initialData: InitialData | undefined
    if (props.mode === "edit") {
        orcamentoId = props.orcamentoId
        initialData = props.initialData
    }

    const [isSavingClient, setIsSavingClient] = useState(false)

    const [clienteModalOpen, setClienteModalOpen] = useState(false)
    const [clienteModalMode, setClienteModalMode] = useState<"create" | "edit">("create")
    const [clienteModalClienteId, setClienteModalClienteId] = useState<number | null>(null)
    const [clienteModalPrefill, setClienteModalPrefill] = useState<{
        nome?: string
        telefone?: string
        bairro?: string
        cidade?: string
    }>({})


    // (opcional) manter uma variável mode se você usa em outros lugares
    const mode: "create" | "edit" = isEdit ? "edit" : "create"



    // reseta Selects quando limpa
    const [cityResetKey, setCityResetKey] = useState(0)
    const [obraResetKey, setObraResetKey] = useState(0)
    const [observacoes, setObservacoes] = useState<string>("")


    const [hydrated, setHydrated] = useState(false)


    /* ---------------------- Flags/Loaders/Modal ---------------------- */
    const [loadingCalc, setLoadingCalc] = useState(false)
    const [loadingPDF, setLoadingPDF] = useState(false)
    const [loadingSave, setLoadingSave] = useState(false)
    const [hideTotals, setHideTotals] = useState(false)
    const [modalSucessoAberto, setModalSucessoAberto] = useState(false)

    /* --------------------------- Catálogos --------------------------- */
    const [catalogo, setCatalogo] = useState<{
        // madeiras agora vêm por fornecedor → usamos 'catalogoMadeiras'
        madeiras: { nome: string; preco: number }[]
        materiaisGerais: { nome: string; preco: number }[]
        telhas: { nome: string; preco: number }[]
    }>({ madeiras: [], materiaisGerais: [], telhas: [] })

    // catálogo dinâmico para MADEIRAS (depende do fornecedor selecionado)
    const [catalogoMadeiras, setCatalogoMadeiras] = useState<{ nome: string; preco: number }[]>([])

    const [componentes, setComponentes] = useState<Componente[]>([])
    const [tiposObra, setTiposObra] = useState<TipoObra[]>([])
    const [cidades, setCidades] = useState<Cidade[]>([])

    // fornecedores (lista + seleção)
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
    const [fornecedorSel, setFornecedorSel] = useState<number | null>(null)
    const fornecedorSelObj = useMemo(
        () => fornecedores.find(f => f.id === fornecedorSel) || null,
        [fornecedores, fornecedorSel]
    )

    useEffect(() => {
        // materiais gerais e telhas continuam vindos por props
        setCatalogo({
            madeiras: [], // ignorado (usamos catalogoMadeiras)
            materiaisGerais: catalogoProp?.materiaisGerais ?? [],
            telhas: catalogoProp?.telhas ?? [],
        })
        setComponentes(componentesProp ?? [])
        setTiposObra(tiposObraProp ?? [])
        setCidades(cidadesProp ?? [])
    }, [catalogoProp, componentesProp, tiposObraProp, cidadesProp])

    // carregar fornecedores SEM seleção inicial (sempre vazio)
    useEffect(() => {
        ; (async () => {
            try {
                // Filter suppliers for "madeira" type (case-insensitive)
                const lista = await getFornecedores()
                // Sort by name for better UX
                lista.sort((a, b) => a.nome.localeCompare(b.nome))
                setFornecedores(lista)

                // só zera seleção no CREATE; no EDIT preserva para pré-selecionar
                if (!isEdit) {
                    try { localStorage.removeItem("gd.fornecedorSelecionado") } catch { }
                    setFornecedorSel(null)
                }
            } catch (e: any) {
                toast.error(e?.message ?? "Falha ao carregar fornecedores")
            }
        })()
    }, [isEdit])

    useEffect(() => {
        if (!isEdit) return
        const id = Number(initialData?.fornecedorId)
        if (Number.isFinite(id) && fornecedores.length && fornecedores.some(f => f.id === id)) {
            setFornecedorSel(id)
        }
    }, [isEdit, initialData?.fornecedorId, fornecedores])




    // ao trocar fornecedor → buscar madeiras (sem gravar em localStorage)
    useEffect(() => {
        if (!fornecedorSel) return
            ; (async () => {
                try {
                    const list = await getMadeirasByFornecedor(fornecedorSel)
                    setCatalogoMadeiras(list)
                } catch (e: any) {
                    toast.error(e?.message ?? "Falha ao listar madeiras do fornecedor")
                }
            })()
    }, [fornecedorSel])


    // ATUALIZAR preços na tabela de MADEIRAS quando fornecedor/catalogo mudarem
    useEffect(() => {
        if (!fornecedorSel) return
        if (!catalogoMadeiras.length) return
        if (!materiais.madeiras.length) return

        const mapa = new Map(catalogoMadeiras.map(o => [o.nome, o.preco]))

        let changed = 0
        const missing: string[] = []
        let newEditPrice: number | undefined

        const atualizadas = materiais.madeiras.map(m => {
            const novoPreco = mapa.get(m.nome)
            if (novoPreco == null) {
                missing.push((m.nome ?? "").trim())
                return m
            }
            if (Number(novoPreco) !== Number(m.preco)) {
                changed++
                if (edit?.cat === "madeiras" && edit.id === m.id) {
                    newEditPrice = novoPreco
                }
                return { ...m, preco: novoPreco }
            }
            return m
        })

        if (changed > 0) {
            setMateriais(prev => ({ ...prev, madeiras: atualizadas }))
            if (newEditPrice !== undefined) {
                setEditData(d => ({ ...d, preco: newEditPrice! }))
            }
            toast.success(`Preços de madeiras atualizados (${changed})`)
        }

        const unicos = Array.from(new Set(missing.filter(Boolean)))
        if (unicos.length) {
            const lista = unicos.slice(0, 8).join(", ") + (unicos.length > 8 ? "…" : "")
            toast.warning(`Itens não encontrados no fornecedor selecionado: ${lista}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fornecedorSel, catalogoMadeiras])




    // refs para detectar clique fora dos dropdowns (Nome/Telefone)
    const nomeBoxRef = useRef<HTMLDivElement | null>(null)
    const telBoxRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as Node
            // fecha Nome se clicar fora
            if (nomeBoxRef.current && !nomeBoxRef.current.contains(t)) {
                setQNome("")
                setResNome([])
            }
            // fecha Telefone se clicar fora
            if (telBoxRef.current && !telBoxRef.current.contains(t)) {
                setQTel("")
                setResTel([])
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setQNome(""); setResNome([])
                setQTel(""); setResTel([])
            }
        }
        document.addEventListener("pointerdown", onPointerDown, true)
        window.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true)
            window.removeEventListener("keydown", onKey)
        }
    }, [])



    /* ---------------------- Estado principal (Etapas) ---------------------- */
    const [titulo, setTitulo] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<"salvar" | "gerar" | "salvar_copia" | null>(null)
    const [tituloTemporario, setTituloTemporario] = useState("")

    // estado do formulário (Etapa 1)
    const [form, setForm] = useState({ nome: "", telefone: "", cidade: "", bairro: "" })
    const [tipoObra, setTipoObra] = useState<string | null>(null)

    // ——— Cliente associado ao orçamento ———
    const [clienteId, setClienteId] = useState<number | null>(null)
    // snapshot (pra futura lógica de “Editar cliente” quando sujar nome/telefone/cidade/bairro)
    const [clienteSnap, setClienteSnap] = useState({ nome: "", telefone: "", cidade: "", bairro: "" })
    const clienteDirty = useMemo(() => {
        const telA = (form.telefone || "").replace(/\D/g, "")
        const telB = (clienteSnap.telefone || "").replace(/\D/g, "")
        return (
            normalizeHuman(form.nome) !== normalizeHuman(clienteSnap.nome) ||
            telA !== telB ||
            normalizeHuman(form.cidade) !== normalizeHuman(clienteSnap.cidade) ||
            normalize(form.bairro) !== normalize(clienteSnap.bairro)
        )
    }, [form, clienteSnap])


    const ensureClienteAssociado = (): boolean => {
        if (clienteId == null) {
            toast.error("Selecione ou cadastre um cliente antes de continuar.")
            const el = document.getElementById(FIELD_IDS.cadastrarCliente) || document.getElementById(FIELD_IDS.nome)
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" })
                    ; (el as HTMLInputElement).focus?.()
            }
            return false
        }
        return true
    }

    const buildClienteLog = () => ({
        id: clienteId ?? undefined,
        nome: form.nome,
        telefone: form.telefone,
        bairro: form.bairro,
        cidade: form.cidade,
    })



    // ------ Autocomplete states (Nome / Telefone) ------
    const [qNome, setQNome] = useState("")
    const [loadingNome, setLoadingNome] = useState(false)
    const [resNome, setResNome] = useState<ClienteSearchResult[]>([])

    const [qTel, setQTel] = useState("")
    const [loadingTel, setLoadingTel] = useState(false)
    const [resTel, setResTel] = useState<ClienteSearchResult[]>([])

    // fetch debounced (Nome)
    useEffect(() => {
        const q = qNome.trim()
        let active = true
        const t = setTimeout(async () => {
            try {
                if (q.length < 2) { setResNome([]); return }
                setLoadingNome(true)
                const data = await buscarClientes("name", q, 10)
                if (active) setResNome(data)
            } catch (e: any) {
                console.error(e)
            } finally {
                setLoadingNome(false)
            }
        }, 300)
        return () => { active = false; clearTimeout(t) }
    }, [qNome])

    // fetch debounced (Telefone)
    useEffect(() => {
        const q = qTel.replace(/\D/g, "")
        let active = true
        const t = setTimeout(async () => {
            try {
                if (q.length < 3) { setResTel([]); return }
                setLoadingTel(true)
                const data = await buscarClientes("phone", q, 10)
                if (active) setResTel(data)
            } catch (e: any) {
                console.error(e)
            } finally {
                setLoadingTel(false)
            }
        }, 300)
        return () => { active = false; clearTimeout(t) }
    }, [qTel])


    const onPickCliente = (c: ClienteSearchResult) => {
        const nome = c.nome ?? ""
        const telefone = c.telefone ? formatPhone(c.telefone) : ""
        const cidade = c.cidade_nome ?? ""
        const bairro = c.bairro ?? ""
        setClienteId(c.id)
        setForm({ nome, telefone, cidade, bairro })
        const snap = { nome, telefone, cidade, bairro }
        setClienteSnap(snap)
        toast.success("Cliente associado.")
    }

    const openClienteModalCreate = () => {
        setClienteModalMode("create")
        setClienteModalClienteId(null)
        setClienteModalPrefill({
            nome: form.nome,
            telefone: form.telefone,
            bairro: form.bairro,
            cidade: form.cidade,
        })
        setClienteModalOpen(true)
    }

    const openClienteModalEdit = () => {
        if (!clienteId) {
            toast.error("Selecione um cliente para editar.")
            return
        }
        setClienteModalMode("edit")
        setClienteModalClienteId(clienteId)
        setClienteModalPrefill({})
        setClienteModalOpen(true)
    }

    const onClienteSaved = (c: {
        id: number
        nome: string
        telefone: string | null
        bairro: string | null
        cidade_nome: string | null
    }) => {
        const nome = c.nome ?? ""
        const telefone = c.telefone ? formatPhone(c.telefone) : ""
        const cidade = c.cidade_nome ?? ""
        const bairro = c.bairro ?? ""

        setClienteId(Number(c.id))
        setForm({ nome, telefone, cidade, bairro })

        const snap = { nome, telefone, cidade, bairro }
        setClienteSnap(snap)

        localStorage.setItem("orcamento.clienteId", String(Number(c.id)))
        localStorage.setItem("orcamento.clienteSnap", JSON.stringify(snap))

        toast.success(clienteModalMode === "edit" ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!")
        setClienteModalOpen(false)
    }





    const selectedTipoId =
        tiposObra.find((x) => x.tipo_obra === (tipoObra ?? ""))?.id ?? null

    const isCobertaL =
        ((tipoObra ?? "")
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase()
            .startsWith("coberta em l"))


    const [dim, setDim] = useState<Dim>({
        largura: 0,
        comprimento: 0,
        larguraMaior: 0,
        larguraMenor: 0,
        comprimentoMaior: 0,
        comprimentoMenor: 0,
    })

    const [materiais, setMateriais] = useState<MateriaisPorCategoria>({
        madeiras: [],
        materiaisGerais: [],
        telhas: [],
    })

    // —— Etapa 4 / Geração —— //
    const [links, setLinks] = useState<LinksState>({})
    const [tituloConfirmado, setTituloConfirmado] = useState(false)
    const [tituloSnap, setTituloSnap] = useState("") // título confirmado (normalizado)
    const [autoTituloSnap, setAutoTituloSnap] = useState("") // autoTítulo confirmado (normalizado)

    /* ----------------------------- Progresso ----------------------------- */
    const progEtapa1 = (Object.values(form).filter(v => v.trim()).length / 4) * 33
    const progEtapa2 = materiais.madeiras.length ? 34 : 0
    const progresso = Math.round(progEtapa1 + (tipoObra ? 33 : 0) + progEtapa2)

    const copyLink = async (value: string, label: string) => {
        if (!value?.trim()) return
        try {
            await navigator.clipboard.writeText(value)
            toast.success(`Link de ${label} copiado!`)
        } catch (e) {
            toast.error(`Não foi possível copiar o link de ${label}.`)
            console.error(e)
        }
    }

    /* ===================================================================
     *                    HIDRATAÇÃO inicial (modo EDIT)
     * =================================================================== */
    useEffect(() => {
        if (!isEdit || !initialData) return

        const slide = initialData.links.slide ?? initialData.links.slideUrl ?? undefined
        const pdf = initialData.links.pdf ?? initialData.links.pdfUrl ?? undefined

        // Campos do cliente (formatar telefone p/ UI)
        const nome = initialData.cliente.nome ?? ""
        const telefone = formatPhone(initialData.cliente.telefone ?? "")
        const bairro = initialData.cliente.bairro ?? ""
        const cidade = initialData.cliente.cidade ?? ""

        setTitulo(initialData.titulo ?? "")
        setForm({ nome, telefone, bairro, cidade })

        // Associação ao entrar no editar
        setClienteId(initialData.clienteId ?? null)
        const snap = { nome, telefone, cidade, bairro }
        setClienteSnap(snap)

        // Persistência leve para refresh
        localStorage.setItem("orcamento.clienteId", String(initialData.clienteId ?? ""))
        localStorage.setItem("orcamento.clienteSnap", JSON.stringify(snap))

        setTipoObra(initialData.parametros.tipoObra ?? null)
        setDim(prev => ({
            ...prev,
            largura: Number(initialData.parametros.largura ?? 0),
            comprimento: Number(initialData.parametros.comprimento ?? 0),
            larguraMaior: Number(initialData.parametros.larguraMaior ?? 0),
            larguraMenor: Number(initialData.parametros.larguraMenor ?? 0),
            comprimentoMaior: Number(initialData.parametros.comprimentoMaior ?? 0),
            comprimentoMenor: Number(initialData.parametros.comprimentoMenor ?? 0),
        }))

        setMateriais(initialData.materiais)
        setTotEdit(initialData.totais)
        setTelhaValores({ ...initialData.telhaValores })
        setLinks({ slide, pdf })

        setTituloConfirmado(false)
        setTituloSnap("")
        setAutoTituloSnap("")

        // Pré-seleção do fornecedor (corrige string vs number)
        const fornecedorIdNorm =
            initialData.fornecedorId != null ? Number(initialData.fornecedorId) : null
        setFornecedorSel(
            Number.isFinite(fornecedorIdNorm as any) ? (fornecedorIdNorm as number) : null
        )

        setObservacoes((initialData?.observacoes ?? "") || "")

        setHydrated(true)
    }, [isEdit, initialData])



    /* ===================================================================
     *                         Handlers (Etapa 1)
     * =================================================================== */
    const resetTotais = () => {
        try {
            // Recalcula APENAS o que é derivado das tabelas (madeiras e materiais)
            const madeirasSubtotal = subtotalMadeiras(materiais.madeiras)
            const materiaisSubtotal = subtotalGeral(materiais.materiaisGerais)

            // Atualiza totEdit de forma imutável e, em seguida, recalcula Telhas – valores fixos
            setTotEdit(prev => {
                const next = {
                    ...prev,
                    madeiras: madeirasSubtotal,
                    materiais: materiaisSubtotal,
                    // NÃO mexe em: comissao, frete, empresaPS, empresaGD
                }

                const nextSoma = Object.values(next).reduce((s, v) => s + v, 0)
                setTelhaValores(calcTelhaValores(materiais.telhas, nextSoma))



                return next
            })

            toast.success("Totais recalculados a partir das tabelas (reset suave).")
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro ao recalcular valores."
            toast.error(msg)
            console.error(err)
        }
    }



    const onFormChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: name === "telefone" ? formatPhone(value) : value }))
    }

    const gerarTituloAutomatico = () => {
        const sanitize = (text: string) => text.trim().replace(/\s+/g, " ").replace(/,/g, "")
        if (!form.nome && !form.bairro && !tipoObra) return ""
        return `${sanitize(form.nome)} ${sanitize(form.bairro)} ${sanitize(tipoObra ?? "")}`.trim()
    }


    const STORAGE_KEY = "orcamento-draft"

    const clearAll = () => {
        setForm({ nome: "", telefone: "", cidade: "", bairro: "" })
        setClienteId(null)
        setClienteSnap({ nome: "", telefone: "", cidade: "", bairro: "" })
        setQNome(""); setResNome([])
        setQTel(""); setResTel([])
        localStorage.removeItem("orcamento.clienteId")
        localStorage.removeItem("orcamento.clienteSnap")
        try { localStorage.removeItem("gd.fornecedorSelecionado") } catch { }
        setFornecedorSel(null)
        setCityResetKey(k => k + 1)
        setObraResetKey(k => k + 1)
        setTipoObra(null)
        setDim({ largura: 0, comprimento: 0, larguraMaior: 0, larguraMenor: 0, comprimentoMaior: 0, comprimentoMenor: 0 })
        setMateriais({ madeiras: [], materiaisGerais: [], telhas: [] })
        setTotEdit({ madeiras: 0, materiais: 0, frete: 0, comissao: 0, empresaPS: 0, empresaGD: 0 })
        setTelhaValores({})
        setTitulo("")
        setTituloTemporario("")
        setTituloConfirmado(false)
        setTituloSnap("")
        setAutoTituloSnap("")
        setLinks({})
        setObservacoes("")
        if (!isEdit) localStorage.removeItem(STORAGE_KEY)
    }


    const clearEtapa1 = () => {
        setForm({ nome: "", telefone: "", cidade: "", bairro: "" })
        setCityResetKey(k => k + 1)
        setClienteId(null)
        setObservacoes("")
        setClienteSnap({ nome: "", telefone: "", cidade: "", bairro: "" })
        setQNome(""); setResNome([])
        setQTel(""); setResTel([])
        localStorage.removeItem("orcamento.clienteId")
        localStorage.removeItem("orcamento.clienteSnap")
    }


    /* ===================================================================
     *                         Cálculo (Etapa 2)
     * =================================================================== */
    const clearEtapa2 = () => {
        setTipoObra(null)
        setObraResetKey(k => k + 1)
        setDim({
            largura: 0,
            comprimento: 0,
            larguraMaior: 0,
            larguraMenor: 0,
            comprimentoMaior: 0,
            comprimentoMenor: 0,
        })

        setMateriais({ madeiras: [], materiaisGerais: [], telhas: [] })
    }

    const calcular = async (): Promise<void> => {
        if (!tipoObra || loadingCalc) return
        setLoadingCalc(true)
        try {
            let resultado: { madeira: MaterialCalculado[]; materiais: MaterialCalculado[]; telhas: MaterialCalculado[] }

            if (isCobertaL) {
                // Para coberta em L, respeita o texto escolhido no select (pode ser "Coberta em L - Linha na Parede 15" ou "Coberta em L com linha na parede")
                const tipoSelecionado = tipoObra ?? "Coberta em L"
                resultado = await calcularMateriais(tipoSelecionado, undefined, undefined, {
                    larguraMaior: dim.larguraMaior,
                    comprimentoMaior: dim.comprimentoMaior,
                    larguraMenor: dim.larguraMenor,
                    comprimentoMenor: dim.comprimentoMenor,
                    fornecedorId: Number(fornecedorSel),
                })
            } else {
                resultado = await calcularMateriais(
                    tipoObra,
                    dim.largura,
                    dim.comprimento,
                    { fornecedorId: Number(fornecedorSel) }
                )
            }

            const { madeira, materiais: mats, telhas } = resultado

            const mapRow = (r: MaterialCalculado, i: number): Material => ({
                id: Date.now() + i + Math.random(),
                nome: r.descricao,
                componente: r.componente,
                quantidade: r.quantidade,
                preco: r.preco_unitario,
                tamanho: r.tamanho,
                frete: r.frete ?? 0,
            })

            const madeirasNew = madeira.map(mapRow)
            const materGNew = mats.map(mapRow)
            let telhasNew = telhas.map(mapRow)

            telhasNew = aplicarFreteTelhasPorCidade(telhasNew, cidades, form.cidade)

            setMateriais({ madeiras: madeirasNew, materiaisGerais: materGNew, telhas: telhasNew })

            const madeirasSubtotal = subtotalMadeiras(madeirasNew)
            const materiaisSubtotal = subtotalGeral(materGNew)

            console.group("🟡 DEBUG Antes de calcularTotais")
            console.log("madeirasNew:", madeirasNew)
            console.log("materGNew:", materGNew)
            console.log("telhasNew:", telhasNew)
            console.groupEnd()

            const { maoDeObra, empresaGD } = calcularTotais({
                madeiras: madeirasNew,
                materiais: materGNew,
                telhas: telhasNew
            })

            setTotEdit({
                madeiras: madeirasSubtotal,
                materiais: materiaisSubtotal,
                comissao: 0,
                frete: 0,
                empresaPS: maoDeObra,
                empresaGD: empresaGD,
            })

            toast.success("Cálculo concluído com sucesso!")
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro inesperado no cálculo."
            toast.error(message)
            console.error(err)
        } finally {
            setLoadingCalc(false)
        }
    }



    /* --------------------------- Edição inline --------------------------- */
    const [edit, setEdit] = useState<{ cat: Categoria; id: number } | null>(null)
    const [editData, setEditData] = useState<Omit<Material, "id">>({
        nome: "",
        componente: "",
        quantidade: 1,
        preco: 0,
        tamanho: "",
    })

    const startEdit = (c: Categoria, m: Material) => {
        setEdit({ cat: c, id: m.id })
        setEditData({
            ...m,
            tamanho: m.tamanho !== undefined && m.tamanho !== null ? String(m.tamanho) : "",
            frete: m.frete ?? 0,
        })
    }

    const saveEdit = () => {
        if (!edit) return

        // validações (obrigatórios)
        if (!editData.nome?.trim()) {
            toast.error("Preencha a descrição/madeira antes de salvar.")
            return
        }
        if (edit.cat === "madeiras" && !editData.componente?.trim()) {
            toast.error("Preencha o Componente antes de salvar.")
            return
        }

        const tamanho = toPos(editData.tamanho)
        const quantidade = toPos(editData.quantidade)
        const preco = toPos(editData.preco)
        const frete = toPos(editData.frete)

        setMateriais(prev => ({
            ...prev,
            [edit.cat]: prev[edit.cat].map(m =>
                m.id === edit.id
                    ? {
                        ...m,
                        ...editData,
                        tamanho,
                        quantidade,
                        preco,
                        frete: edit.cat === "telhas" ? frete : undefined,
                    }
                    : m,
            ),
        }))

        toast.success(
            `Edição na tabela ${{ madeiras: "Madeiras", materiaisGerais: "Materiais Gerais", telhas: "Telhas" }[edit.cat]
            } salva com sucesso!`,
        )

        setEdit(null)
    }

    const removeItem = (c: Categoria, id: number) =>
        setMateriais(prev => ({ ...prev, [c]: prev[c].filter(m => m.id !== id) }))

    const addMaterial = (c: Categoria, nomeSel: string) => {
        const novo: Material = {
            id: Date.now(),
            nome: "",
            componente: "",
            quantidade: 1,
            preco: 0,
            tamanho: "",
            frete: c === "telhas" ? 0 : undefined,
        }

        if (nomeSel !== "vazio") {
            const source = c === "madeiras" ? catalogoMadeiras : catalogo[c]
            const ref = source.find(m => m.nome === nomeSel)
            if (ref) {
                novo.nome = ref.nome
                novo.preco = ref.preco
            }
        }
        setMateriais(prev => ({ ...prev, [c]: [...prev[c], novo] }))
        startEdit(c, novo)
    }


    /* ===================================================================
     *                         Totais (Etapa 3)
     * =================================================================== */
    const subtotalMadeiras = (arr: Material[]) =>
        arr.reduce((s, m) => s + toPos(m.tamanho) * toPos(m.quantidade) * toPos(m.preco), 0)
    const subtotalGeral = (arr: Material[]) => arr.reduce((s, m) => s + toPos(m.quantidade) * toPos(m.preco), 0)

    const totMadeiras = subtotalMadeiras(materiais.madeiras)
    const totMateriais = subtotalGeral(materiais.materiaisGerais)

    const [totEdit, setTotEdit] = useState(() => ({
        madeiras: totMadeiras,
        materiais: totMateriais,
        comissao: 0,
        frete: 0,
        empresaPS: 0,
        empresaGD: 0,
    }))

    // totEdit: Record<categoria, number> já existe no seu código

    type TotKey = keyof typeof totEdit
    const [totEditStr, setTotEditStr] = useState<Record<TotKey, string>>(() => {
        const obj: Partial<Record<TotKey, string>> = {}
        for (const [k, v] of Object.entries(totEdit) as [TotKey, number][]) {
            obj[k] = toEditable(v)
        }
        return obj as Record<TotKey, string>
    })



    useEffect(() => {
        setTotEditStr((prev) => {
            const next: Partial<Record<TotKey, string>> = {}
            for (const [k, v] of Object.entries(totEdit) as [TotKey, number][]) {
                // só atualiza o texto se a string atual bate com o anterior já formatado
                // (evita sobrescrever enquanto o usuário está digitando)
                const was = prev?.[k]
                const numWas = parseEditable(was ?? "")
                if (!was || Math.abs(numWas - v) > 0.0001) {
                    next[k] = toEditable(v)
                } else {
                    next[k] = was
                }
            }
            return next as Record<TotKey, string>
        })
    }, [totEdit])



    // telhaValores dinâmico (no create recalcula; no edit vem do BD)
    const [telhaValores, setTelhaValores] = useState<Record<string, Pagto>>({})


    const somaTotal = Object.values(totEdit).reduce((s, v) => s + v, 0)

    const telhaTipos = Array.from(
        new Set(materiais.telhas.map(t => (t.nome ?? "").trim()).filter(Boolean))
    ).sort((a, b) => {
        // Ordem de prioridade: Naturais (1) -> Resinadas (2) -> Outros (3)
        const getPriority = (name: string) => {
            const g = getTileGroup(name)
            if (g === "naturais") return 1
            if (g === "resinadas") return 2
            return 3
        }

        const pA = getPriority(a)
        const pB = getPriority(b)

        if (pA !== pB) return pA - pB
        return a.localeCompare(b, "pt-BR")
    })


    const ensureTelha = (tipo: string): Pagto => ({
        pix: telhaValores?.[tipo]?.pix ?? 0,
        x10: telhaValores?.[tipo]?.x10 ?? 0,
        x18: telhaValores?.[tipo]?.x18 ?? 0,
    })

    useEffect(() => {
        if (isEdit && !hydrated) return
        setTelhaValores(calcTelhaValores(materiais.telhas, somaTotal))
    }, [materiais.telhas, somaTotal, isEdit, hydrated])



    // Mantém subtotais sincronizados com as tabelas em tempo real (create e edit)
    // Não mexe nos campos manuais (comissao, frete, empresaPS, empresaGD)
    useEffect(() => {
        setTotEdit(prev => ({
            ...prev,
            madeiras: subtotalMadeiras(materiais.madeiras),
            materiais: subtotalGeral(materiais.materiaisGerais),
        }))
    }, [materiais.madeiras, materiais.materiaisGerais])



    // Se o usuário editar o TÍTULO depois de confirmar, volta a exigir confirmação
    useEffect(() => {
        if (!tituloConfirmado) return
        if (normalize(titulo) !== tituloSnap) setTituloConfirmado(false)
    }, [titulo, tituloConfirmado, tituloSnap])

    // Se mudar qualquer peça do título automático (nome + tipoObra + bairro), invalida confirmação
    useEffect(() => {
        if (!tituloConfirmado) return
        const autoNow = normalize(gerarTituloAutomatico())
        if (autoNow !== autoTituloSnap) setTituloConfirmado(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.nome, form.bairro, tipoObra, tituloConfirmado, autoTituloSnap])

    const displayLabel: Record<keyof typeof totEdit, string> = {
        madeiras: "Madeiras",
        materiais: "Materiais Gerais",
        comissao: "Comissão",
        frete: "Frete",
        empresaPS: "Empresa PS (Mão de Obra)",
        empresaGD: "Empresa GD",
    }

    /* ===================================================================
     *                        Draft (localStorage)
     * =================================================================== */
    useEffect(() => {
        if (isEdit || typeof window === "undefined") return

        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            try {
                const d = JSON.parse(raw)
                setForm(d.form ?? form)
                setTipoObra(d.tipoObra ?? null)
                setDim(d.dim ?? dim)
                setMateriais(d.materiais ?? materiais)
                setTotEdit(d.totEdit ?? totEdit)
                setTelhaValores(d.telhaValores ?? telhaValores)
                setTitulo(d.titulo ?? "")
                setObservacoes(d.observacoes ?? "")

                if (Number.isFinite(Number(d?.clienteId))) setClienteId(Number(d.clienteId))
                if (d?.clienteSnap) setClienteSnap(d.clienteSnap)
            } catch { }
        } else {
            localStorage.removeItem("orcamento.clienteId")
            localStorage.removeItem("orcamento.clienteSnap")
        }
    }, [isEdit])



    useEffect(() => {
        if (isEdit || typeof window === "undefined") return
        const draft = { form, tipoObra, dim, materiais, totEdit, telhaValores, titulo, observacoes, clienteId, clienteSnap }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    }, [isEdit, form, tipoObra, dim, materiais, totEdit, telhaValores, titulo, clienteId, clienteSnap])


    /* ===================================================================
     *                         Handlers (Fluxos)
     * =================================================================== */
    const showEditBlockedInfo = () => {
        if (!isEdit) return

        toast.info("Edição temporariamente bloqueada.", {
            description: "Para salvar este orçamento, utilize 'Salvar Cópia' como uma nova versão.",
            duration: Infinity,
        })
    }


    const handleCalcular = () => {
        if (!fornecedorSel) {
            toast.error("Selecione um fornecedor antes de calcular.")
            return
        }
        const res = validateCalcular(form, tipoObra, isCobertaL, dim)
        if (!res.ok) {
            toast.warning(res.msg)
            scrollToField(FIELD_IDS[res.missing])
            return
        }
        calcular()
    }




    const handleGerarProposta = async (confirmedTitle?: string) => {
        const snap = (confirmedTitle ?? tituloSnap)?.trim()
        const confirmed = confirmedTitle ? true : tituloConfirmado
        if (!confirmed || !snap) {
            toast.error("Confirme o título antes de gerar a proposta.")
            return
        }

        const valid = validatePreGerar(form, tipoObra, materiais)
        if (!valid.ok) {
            toast.error(valid.msg)
            scrollToField(FIELD_IDS[valid.missing])
            return
        }

        if (mode === "create" && !ensureClienteAssociado()) return

        try {
            setLoadingPDF(true)
            const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)
            setTelhaValores(telhaValoresAtual)

            if (mode === "create") {
                try {
                    setLoadingSave(true)

                    if (!ensureClienteAssociado()) {
                        setLoadingSave(false)
                        return
                    }

                    const payloadCreate = {
                        clienteId: Number(clienteId),
                        cliente: form,
                        parametros: { tipoObra: tipoObra ?? "", ...dim },
                        materiais,
                        totais: totEdit,
                        telhaValores: telhaValoresAtual,
                        titulo: snap,
                        fornecedorId: fornecedorSel ? Number(fornecedorSel) : null,
                        observacoes: (observacoes || "").trim() || null,
                    }

                    const { id: novoId, links } = await gerarPropostaAPI(payloadCreate)

                    setLinks({ slide: links.slideUrl, pdf: links.pdfUrl })

                    await logOrcamentoWebhook({
                        acao: "CRIAR_ORCAMENTO",
                        orcamentoId: novoId,
                        titulo: snap,
                        cliente: buildClienteLog(),
                        usuario: usuarioLog,
                        dadosOrcamento: { ...payloadCreate, links },
                    })

                    toast.success("Orçamento salvo automaticamente.")
                    toast.success("Proposta gerada! Links prontos abaixo.")
                    setModalSucessoAberto(true)
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Erro ao salvar automaticamente"
                    toast.error(msg)
                } finally {
                    setLoadingSave(false)
                }

                return
            }

            const result = await gerarPDF({
                orcamentoId: Number(orcamentoId),
                cliente: form,
                parametros: { tipoObra: tipoObra ?? "", ...dim },
                materiais,
                totais: totEdit,
                telhaValoresDinamicos: telhaValoresAtual,
                titulo: snap,
            })


            const raw = result as any
            const r = Array.isArray(raw) ? raw[0] : raw
            const slide: string | undefined =
                r?.slide ?? r?.slideUrl ?? r?.link_slide ?? r?.links?.slide ?? r?.links?.slideUrl ?? r?.data?.slide ?? r?.data?.slideUrl
            const pdf: string | undefined =
                r?.pdf ?? r?.pdfUrl ?? r?.link_pdf ?? r?.links?.pdf ?? r?.links?.pdfUrl ?? r?.data?.pdf ?? r?.data?.pdfUrl

            setLinks({ slide, pdf })

            if (slide && pdf) {
                if (isEdit) {
                    toast.info(
                        "Links gerados, porém a edição está temporariamente bloqueada.",
                        {
                            description:
                                "A edição deste orçamento não pode ser salva diretamente. Use 'Salvar Cópia' para registrar uma nova versão.",
                            duration: Infinity,
                        }
                    )
                    return
                }

                toast.success("Proposta gerada! Links prontos abaixo.")
            } else {
                toast.error(
                    "A proposta foi gerada, mas não salvamos porque os links não vieram completos (slide e PDF)."
                )
                console.debug("[handleGerarProposta] retorno sem links completos:", result)
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Erro inesperado ao gerar proposta."
            toast.error(msg)
        } finally {
            setLoadingPDF(false)
        }
    }






    // Clique no botão "Gerar Proposta" → valida antes do modal
    const onClickGerarAgora = () => {
        if (loadingPDF) return
        const res = validatePreGerar(form, tipoObra, materiais)
        if (!res.ok) {
            toast.warning(res.msg)
            scrollToField(FIELD_IDS[res.missing])
            return
        }
        // Se já confirmado e nada mudou, gera direto
        const jaConfirmado =
            tituloConfirmado &&
            normalize(titulo) === tituloSnap &&
            normalize(gerarTituloAutomatico()) === autoTituloSnap

        if (jaConfirmado) {
            void handleGerarProposta()
            return
        }
        setModalMode("gerar")
        setTituloTemporario(titulo.trim() || gerarTituloAutomatico())
        setShowModal(true)
    }

    const abrirModalSalvar = () => {
        const inicial = titulo.trim() || gerarTituloAutomatico()
        setModalMode("salvar")
        setTituloTemporario(inicial)
        setShowModal(true)
    }

    const abrirModalSalvarCopia = () => {
        const inicial = titulo.trim() || gerarTituloAutomatico()
        setModalMode("salvar_copia")
        setTituloTemporario(inicial)
        setShowModal(true)
    }

    // payload comum para DB
    const buildDbPayload = (): UpdateOrcamentoInput => {
        // segurança extra: essa função só faz sentido em modo edição
        if (!isEdit) {
            throw new Error("buildDbPayload só deve ser chamado em modo edição.")
        }

        // garante que SEMPRE existe um cliente associado antes de salvar
        if (clienteId == null) {
            throw new Error("Cliente não associado. Cadastre ou associe um cliente antes de salvar o orçamento.")
        }

        // monta 'parametros' de forma inteligente
        const parametros: any = { tipoObra: tipoObra ?? "", tipoObraId: selectedTipoId }

        if (isCobertaL) {
            // Para Coberta em L, enviamos as 4 dimensões
            parametros.larguraMaior = toPos(dim.larguraMaior)
            parametros.larguraMenor = toPos(dim.larguraMenor)
            parametros.comprimentoMaior = toPos(dim.comprimentoMaior)
            parametros.comprimentoMenor = toPos(dim.comprimentoMenor)

            // No EDIT, limpe largura/comprimento se não fizerem parte desse tipo
            if (isEdit) {
                parametros.largura = null
                parametros.comprimento = null
            }
        } else {
            // Obra “normal”: usa largura/comprimento
            parametros.largura = toPos(dim.largura)
            parametros.comprimento = toPos(dim.comprimento)

            // No EDIT, limpe as dimensões da Coberta em L caso tenham ficado no BD
            if (isEdit) {
                parametros.larguraMaior = null
                parametros.larguraMenor = null
                parametros.comprimentoMaior = null
                parametros.comprimentoMenor = null
            }
        }

        const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)

        return {
            titulo,

            // agora SEM undefined — TS feliz e back sempre recebe um número
            clienteId: Number(clienteId),

            cliente: { ...form },
            parametros,
            materiais: {
                madeiras: materiais.madeiras.map(m => ({
                    nome: m.nome,
                    componente: m.componente ?? "",
                    quantidade: toPos(m.quantidade),
                    preco: toPos(m.preco),
                    tamanho: m.tamanho !== undefined && m.tamanho !== null && m.tamanho !== "" ? toPos(m.tamanho) : null,
                    frete: null,
                })),
                materiaisGerais: materiais.materiaisGerais.map(m => ({
                    nome: m.nome,
                    componente: "",
                    quantidade: toPos(m.quantidade),
                    preco: toPos(m.preco),
                    tamanho: null,
                    frete: null,
                })),
                telhas: materiais.telhas.map(m => ({
                    nome: m.nome,
                    componente: "",
                    quantidade: toPos(m.quantidade),
                    preco: toPos(m.preco),
                    tamanho: null,
                    frete: m.frete != null ? toPos(m.frete) : 0,
                })),
            },
            totais: { ...totEdit },
            telhaValores: telhaValoresAtual,
            links: {
                slideUrl: links.slide ?? null,
                pdfUrl: links.pdf ?? null,
            },
            actorUserId: currentUserId,
            fornecedorId: fornecedorSel ? Number(fornecedorSel) : null,
            observacoes: (observacoes || "").trim() || null,
        }
    }




    useEffect(() => {
        setMateriais(prev => {
            if (!prev.telhas.length) return prev;
            const telhasAjustadas = aplicarFreteTelhasPorCidade(prev.telhas, cidades, form.cidade);
            return { ...prev, telhas: telhasAjustadas };
        });
        // Recalcular "telhaValores" é automático via useEffect já existente
    }, [form.cidade, cidades]);



    /* ===================================================================
     *                              JSX
     * =================================================================== */
    const pageTitle = isEdit ? "Editar Orçamento" : "Gerar Orçamento"

    return (
        <PageLayout
            links={[
                { label: "Home", href: "/" },
                { label: "Listar Orçamentos", href: "/orcamento" },
                { label: isEdit ? "Editar Orçamento" : "Gerar Orçamento", href: isEdit && orcamentoId ? `/Orcamento/edit/${orcamentoId}` : "/Orcamento/new" },
            ]}
            headerActions={
                <>
                    {isEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 min-w-[130px]"
                            onClick={abrirModalSalvarCopia}
                            disabled={loadingSave || loadingPDF}
                            title="Cria um novo orçamento a partir deste"
                        >
                            <Copy className="h-4 w-4 mr-1" />
                            Salvar Cópia
                        </Button>
                    )}

                    <Button
                        size="sm"
                        className="h-8 min-w-[150px] bg-bege text-marromEscuro hover:bg-bege/80"
                        onClick={isEdit ? showEditBlockedInfo : abrirModalSalvar}
                        disabled={loadingSave || loadingPDF}
                        title={
                            isEdit
                                ? "Edição temporariamente bloqueada. Use 'Salvar Cópia' para criar uma nova versão."
                                : "Salvar novo orçamento como rascunho"
                        }
                    >
                        <Save className="h-4 w-4 mr-1" />
                        {isEdit ? "Salvar Edição" : "Salvar Orçamento"}
                    </Button>
                </>
            }
        >



            {/* ---------------------------------------------------------------
       *                          Cabeçalho
       * --------------------------------------------------------------- */}
            <Card className="mb-4 shadow-md rounded-2xl">
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold whitespace-nowrap">{pageTitle}</CardTitle>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            className="text-red-500 hover:text-red-700 whitespace-nowrap"
                        >
                            <Trash className="h-4 w-4 mr-1" />
                            Limpar
                        </Button>
                    </div>

                    <CardDescription className="text-sm text-muted-foreground mt-1">
                        Preencha as três etapas abaixo.
                    </CardDescription>

                    {/* Título do orçamento */}
                    <div className="flex flex-col gap-1 mt-2">
                        <Label htmlFor="titulo" className="text-sm font-medium">
                            Título
                        </Label>
                        <Input
                            id="titulo"
                            type="text"
                            placeholder="ex.: Cobertura madeira 123"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            className="h-8 w-56 sm:w-64"
                        />
                    </div>

                    <Progress value={progresso} className="mt-3" />
                </CardHeader>
            </Card>

            {/* ---------------------------------------------------------------
 *                          ETAPA 1
 * --------------------------------------------------------------- */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Card: Dados Pessoais */}
                <DadosPessoaisCard
                    fieldIds={FIELD_IDS}
                    form={form}
                    onFormChange={onFormChange}
                    nomeBoxRef={nomeBoxRef}
                    telBoxRef={telBoxRef}
                    qNome={qNome}
                    setQNome={setQNome}
                    loadingNome={loadingNome}
                    resNome={resNome}
                    setResNome={setResNome}
                    qTel={qTel}
                    setQTel={setQTel}
                    loadingTel={loadingTel}
                    resTel={resTel}
                    setResTel={setResTel}
                    onPickCliente={onPickCliente}
                    clearEtapa1={clearEtapa1}
                    clienteId={clienteId}
                    openClienteModalCreate={openClienteModalCreate}
                    openClienteModalEdit={openClienteModalEdit}
                    isSavingClient={false}
                />

                {/* NOVO: Fornecedor Madeiras */}
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-lg">Configurações da Obra</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <Label>Fornecedor (Madeira)</Label>
                                <Select
                                    value={fornecedorSel ? String(fornecedorSel) : ""}
                                    onValueChange={(val) => {
                                        const id = Number(val)
                                        setFornecedorSel(Number.isFinite(id) ? id : null)
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione o fornecedor..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fornecedores.map((f) => (
                                            <SelectItem key={f.id} value={String(f.id)}>
                                                {f.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Define a tabela de preços de madeira e o fornecedor padrão para pedidos.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>



                {/* Card: Observações */}
                <Card>
                    <CardHeader className="p-4">
                        <div className="flex justify-between items-start sm:items-center">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    Etapa 1
                                </Badge>
                                <CardTitle className="text-lg">Observações</CardTitle>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setObservacoes("")}
                                className="text-red-500 hover:text-red-700"
                                title="Limpar observações"
                            >
                                <Trash className="h-4 w-4 mr-1" /> Limpar
                            </Button>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground mt-1">
                            Campo opcional para notas internas do orçamento (não aparece para o cliente).
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="obs-textarea">Observações</Label>
                            <Textarea
                                id="obs-textarea"
                                placeholder="Ex.: Cliente prefere contato à tarde; telhas devem ser entregues pela fornecedora X..."
                                className="min-h-[180px] resize-y border-0 bg-cinza rounded-xl px-3 py-2 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                            />
                            <div className="text-xs text-muted-foreground text-right">
                                {observacoes.length} caractere{observacoes.length === 1 ? "" : "s"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>




            {/* ---------------------------------------------------------------
       *                          ETAPA 2
       * --------------------------------------------------------------- */}
            <Card className="mt-4">
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start sm:items-center">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Etapa 2</Badge>
                            <CardTitle className="text-lg">Materiais</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearEtapa2} className="text-red-500 hover:text-red-700">
                            <Trash className="h-4 w-4 mr-1" /> Limpar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-4 space-y-6">
                    {/* Filtros / parâmetros */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor={FIELD_IDS.tipoObra}>Tipo de Obra</Label>
                            <Select key={obraResetKey} value={tipoObra ?? undefined} onValueChange={v => setTipoObra(v)}>
                                <SelectTrigger className={["w-56", styleForTriggerId(selectedTipoId)].join(" ")}>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tiposObra.map((t) => (
                                        <SelectItem
                                            key={t.id}
                                            value={t.tipo_obra}
                                            className={styleForItemId(t.id)}
                                        >
                                            {t.tipo_obra}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>



                        {isCobertaL ? (
                            ([
                                ["larguraMaior", "Largura maior"],
                                ["larguraMenor", "Largura menor"],
                                ["comprimentoMaior", "Comprimento maior"],
                                ["comprimentoMenor", "Comprimento menor"],
                            ] as const).map(([k, label]) => (
                                <div key={k} className="flex flex-col gap-1">
                                    <Label>{label} (m)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={dim[k]}
                                        onChange={e => {
                                            const v = Math.max(0, Number(e.target.value))
                                            setDim(p => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }))
                                        }}
                                        className="w-32"
                                    />
                                </div>
                            ))
                        ) : (
                            (["largura", "comprimento"] as const).map(k => (
                                <div key={k} className="flex flex-col gap-1">
                                    <Label className="capitalize">{k} (m)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={dim[k]}
                                        onChange={e => {
                                            const v = Math.max(0, Number(e.target.value))
                                            setDim(p => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }))
                                        }}
                                        className="w-32"
                                    />
                                </div>
                            ))
                        )}

                        <div className="flex flex-col gap-1">
                            <Label>Fornecedor</Label>
                            <ComboboxAdd
                                key={`forn-${fornecedorSel ?? 0}-${fornecedores.length}`}
                                buttonText={
                                    fornecedorSelObj?.nome
                                    || initialData?.fornecedorNome
                                    || (initialData as any)?.fornecedor?.nome
                                    || "Selecione"
                                }
                                placeholder="Buscar fornecedor..."
                                widthClass="w-56"
                                disabled={!fornecedores.length}
                                items={fornecedores
                                    .filter(f => f.tipo && f.tipo.toLowerCase().includes("madeira"))
                                    .map(f => ({ value: String(f.id), label: f.nome }))}
                                onSelect={(v) => setFornecedorSel(Number(v))}
                                showEmptyOption={false}
                            />

                        </div>


                        <Button onClick={handleCalcular} disabled={loadingCalc} className="min-w-[132px]">
                            {loadingCalc ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Calculando…
                                </>
                            ) : (
                                <>
                                    <Calculator className="h-4 w-4 mr-1" /> Calcular
                                </>
                            )}
                        </Button>
                    </div>



                    {/* Tabelas por categoria */}
                    {(
                        [
                            ["madeiras", "Madeiras"],
                            ["materiaisGerais", "Materiais Gerais"],
                            ["telhas", "Telhas"],
                        ] as [Categoria, string][]
                    ).map(([cat, titulo]) => (
                        <div key={cat} className="border rounded-lg shadow-sm" id={cat === "madeiras" ? FIELD_IDS.madeiras : undefined}>
                            {/* Cabeçalho da tabela */}
                            <div className="flex justify-between items-center px-3 py-2 bg-bege rounded-t-lg">
                                <span className="font-medium text-sm">
                                    {cat === "madeiras" && fornecedorSelObj ? `Madeiras — ${fornecedorSelObj.nome}` : titulo}
                                </span>

                                <div className="flex items-center gap-2">
                                    <ComboboxAdd
                                        buttonText="+ Adicionar"
                                        placeholder="Buscar item..."
                                        widthClass="w-52"
                                        disabled={cat === "madeiras" && !fornecedorSel}
                                        showEmptyOption
                                        emptyLabel="(linha vazia)"
                                        items={(cat === "madeiras" ? catalogoMadeiras : catalogo[cat]).map(o => ({
                                            value: o.nome,
                                            label: o.nome,
                                        }))}
                                        onSelect={(v) => {
                                            addMaterial(cat, v)
                                        }}
                                    />

                                </div>

                            </div>


                            {/* Corpo da tabela */}
                            <div className="overflow-x-auto">
                                <Table className="min-w-[700px]">
                                    <TableHeader>
                                        <TableRow className="bg-cinza">
                                            {cat === "madeiras" ? (
                                                <>
                                                    <TableHead>Componente</TableHead>
                                                    <TableHead>Madeira</TableHead>
                                                    <TableHead className="w-28 text-right">Quantidade</TableHead>
                                                    <TableHead className="w-28 text-right">Tamanho</TableHead>
                                                </>
                                            ) : (
                                                <>
                                                    <TableHead>Descrição</TableHead>
                                                    <TableHead className="w-28 text-right">Quantidade</TableHead>
                                                </>
                                            )}
                                            <TableHead className="w-28 text-right">
                                                {cat === "madeiras" ? "Preço (m)" : "Preço (un)"}
                                            </TableHead>
                                            {cat === "telhas" && <TableHead className="w-28 text-right">Frete</TableHead>}
                                            <TableHead className="w-28 text-right">Total</TableHead>
                                            <TableHead className="w-20 text-center">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {materiais[cat].map(m => {
                                            const ed = edit?.cat === cat && edit.id === m.id
                                            const tam = toPos(ed ? editData.tamanho : m.tamanho)
                                            const qtd = toPos(ed ? editData.quantidade : m.quantidade)
                                            const preco = toPos(ed ? editData.preco : m.preco)
                                            const frete = toPos(ed ? (editData.frete ?? 0) : (m.frete ?? 0))

                                            const total =
                                                cat === "madeiras" ? tam * qtd * preco : cat === "telhas" ? qtd * preco + frete : qtd * preco

                                            return (
                                                <TableRow key={m.id}>
                                                    {cat === "madeiras" ? (
                                                        <>
                                                            {/* Componente */}
                                                            <TableCell>
                                                                {ed ? (
                                                                    <ComboboxAdd
                                                                        buttonText={editData.componente?.trim() || "Selecione"}
                                                                        placeholder="Buscar componente..."
                                                                        widthClass="w-[220px]"
                                                                        items={componentes.map(c => ({ value: c.nome, label: c.nome }))}
                                                                        onSelect={(v) => setEditData(d => ({ ...d, componente: v }))}
                                                                        showEmptyOption={false}
                                                                    />
                                                                ) : (
                                                                    m.componente
                                                                )}
                                                            </TableCell>


                                                            {/* Madeira */}
                                                            <TableCell>
                                                                {ed ? (
                                                                    <ComboboxAdd
                                                                        buttonText={editData.nome?.trim() || "Selecione"}
                                                                        placeholder="Buscar madeira..."
                                                                        widthClass="w-[260px]"
                                                                        items={catalogoMadeiras.map(o => ({ value: o.nome, label: o.nome }))}
                                                                        onSelect={(v) => {
                                                                            const ref = catalogoMadeiras.find(x => x.nome === v)
                                                                            setEditData(d => ({ ...d, nome: v, preco: ref ? ref.preco : d.preco }))
                                                                        }}
                                                                        showEmptyOption={false}
                                                                    />
                                                                ) : (
                                                                    m.nome
                                                                )}
                                                            </TableCell>


                                                            {/* Quantidade */}
                                                            <TableCell className="text-right">
                                                                {ed ? (
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step={1}
                                                                        value={editData.quantidade}
                                                                        onChange={e => {
                                                                            const v = Math.max(0, Number(e.target.value))
                                                                            setEditData(d => ({ ...d, quantidade: Number.isFinite(v) ? v : 0 }))
                                                                        }}
                                                                        className="h-8 text-right"
                                                                    />
                                                                ) : (
                                                                    m.quantidade
                                                                )}
                                                            </TableCell>

                                                            {/* Tamanho */}
                                                            <TableCell className="text-right">
                                                                {ed ? (
                                                                    <Input
                                                                        type="number"
                                                                        lang="pt-BR"
                                                                        min={0}
                                                                        step={0.5}
                                                                        value={editData.tamanho ?? ""}
                                                                        onChange={e => setEditData(d => ({ ...d, tamanho: e.target.value }))}
                                                                        onBlur={e => {
                                                                            const raw = e.target.value.replace(",", ".")
                                                                            const v = Math.max(0, parseFloat(raw) || 0)
                                                                            setEditData(d => ({ ...d, tamanho: String(v) }))
                                                                        }}
                                                                        className="h-8 text-right"
                                                                    />
                                                                ) : typeof m.tamanho === "number" ? (
                                                                    String(m.tamanho).replace(".", ",")
                                                                ) : (
                                                                    m.tamanho ?? "-"
                                                                )}
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Outras categorias */}
                                                            {/* Descrição (Materiais Gerais / Telhas) */}
                                                            <TableCell>
                                                                {ed ? (
                                                                    <ComboboxAdd
                                                                        buttonText={editData.nome?.trim() || "Selecione"}
                                                                        placeholder="Buscar item..."
                                                                        widthClass="w-[260px]"
                                                                        items={catalogo[cat].map(o => ({ value: o.nome, label: o.nome }))}
                                                                        onSelect={(v) => {
                                                                            const ref = catalogo[cat].find(x => x.nome === v)
                                                                            setEditData(d => ({ ...d, nome: v, preco: ref ? ref.preco : d.preco }))
                                                                        }}
                                                                        showEmptyOption={false}
                                                                    />
                                                                ) : (
                                                                    m.nome
                                                                )}
                                                            </TableCell>


                                                            {/* Quantidade */}
                                                            <TableCell className="text-right">
                                                                {ed ? (
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step={1}
                                                                        value={editData.quantidade}
                                                                        onChange={e => {
                                                                            const v = Math.max(0, Number(e.target.value))
                                                                            setEditData(d => ({ ...d, quantidade: Number.isFinite(v) ? v : 0 }))
                                                                        }}
                                                                        className="h-8 text-right"
                                                                    />
                                                                ) : (
                                                                    m.quantidade
                                                                )}
                                                            </TableCell>

                                                        </>
                                                    )}

                                                    {/* Preço */}
                                                    <TableCell className="text-right">
                                                        {ed ? (
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step={0.01}
                                                                value={editData.preco}
                                                                onChange={e => {
                                                                    const v = Math.max(0, Number(e.target.value))
                                                                    setEditData(d => ({ ...d, preco: Number.isFinite(v) ? v : 0 }))
                                                                }}
                                                                className="h-8 text-right"
                                                            />
                                                        ) : (
                                                            formatBR(m.preco)
                                                        )}
                                                    </TableCell>

                                                    {/* Frete (só telhas) */}
                                                    {cat === "telhas" && (
                                                        <TableCell className="text-right">
                                                            {ed ? (
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    step={0.01}
                                                                    value={editData.frete ?? 0}
                                                                    onChange={e => {
                                                                        const v = Math.max(0, Number(e.target.value))
                                                                        setEditData(d => ({ ...d, frete: Number.isFinite(v) ? v : 0 }))
                                                                    }}
                                                                    className="h-8 text-right"
                                                                />
                                                            ) : (
                                                                formatBR(m.frete ?? 0)
                                                            )}
                                                        </TableCell>
                                                    )}

                                                    {/* Total */}
                                                    <TableCell className="text-right">{formatBR(total)}</TableCell>

                                                    {/* Ações */}
                                                    <TableCell className="text-center">
                                                        {ed ? (
                                                            <Button size="icon" variant="ghost" onClick={saveEdit}>
                                                                <Save className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button size="icon" variant="ghost" onClick={() => startEdit(cat, m)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={() => removeItem(cat, m.id)}>
                                                                    <Trash className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ---------------------------------------------------------------
       *                          ETAPA 3
       * --------------------------------------------------------------- */}
            <Card className="mt-4">
                <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Etapa 3</Badge>
                        <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Totais por Categoria */}
                    <Card className="shadow-sm">
                        <CardHeader className="p-3">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-sm">Totais por Categoria</CardTitle>

                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="text-marromEscuro" onClick={() => setHideTotals(p => !p)}>
                                        {hideTotals ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex items-center gap-1 bg-bege text-marromEscuro hover:bg-bege/70"
                                        onClick={resetTotais}
                                    >
                                        <RotateCcw className="h-4 w-4" /> Resetar Valores
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-3">
                            <Table>
                                <TableBody>
                                    {(Object.entries(totEdit) as [TotKey, number][]).map(([k, v]) => (
                                        <TableRow key={k}>
                                            <TableCell>{displayLabel[k]}</TableCell>

                                            <TableCell className="pr-0">
                                                {hideTotals ? (
                                                    <div className="text-right">••••••</div>
                                                ) : (
                                                    <div className="flex justify-end items-center gap-2">
                                                        <span className="text-muted-foreground">R$</span>
                                                        <input
                                                            inputMode="decimal"
                                                            className="w-36 h-8 rounded-md border px-2 text-right"
                                                            value={totEditStr[k] ?? ""}
                                                            onFocus={(e) => {
                                                                // Ao focar, tira qualquer formatação residual e volta para modo editável
                                                                const num = parseEditable(e.target.value)
                                                                setTotEditStr((p) => ({ ...p, [k]: toEditable(num) }))
                                                            }}
                                                            onChange={(e) => {
                                                                // Digitação NATURAL: aceita só dígitos e vírgula, sem milhar
                                                                const raw = e.target.value
                                                                const filtered = raw.replace(/[^\d,]/g, "")
                                                                setTotEditStr((p) => ({ ...p, [k]: filtered }))
                                                                // Atualiza o numérico em tempo real para manter os cálculos corretos
                                                                const num = parseEditable(filtered)
                                                                setTotEdit((p) => ({ ...p, [k]: num }))
                                                            }}
                                                            onBlur={(e) => {
                                                                // Ao sair, mostramos bonito (BRL) na string — opcional
                                                                // Se preferir manter SEM milhar também no blur, troque por toEditable(num).
                                                                const num = parseEditable(e.target.value)
                                                                setTotEditStr((p) => ({ ...p, [k]: formatBR(num) }))
                                                                setTotEdit((p) => ({ ...p, [k]: num }))
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    <TableRow className="font-semibold border-t">
                                        <TableCell>Total Geral</TableCell>
                                        <TableCell className="text-right">
                                            {hideTotals ? "••••••" : formatBR(somaTotal)}
                                        </TableCell>
                                    </TableRow>

                                    {/* Margem Indicator */}
                                    <TableRow>
                                        <TableCell className="font-medium text-muted-foreground">Margem Bruta (aprox)</TableCell>
                                        <TableCell className="text-right">
                                            {(() => {
                                                if (hideTotals) return "••••••"
                                                const vals = Object.values(telhaValores).flatMap(v => [v.pix, v.x10, v.x18])
                                                const maxVal = vals.length ? Math.max(...vals) : 0
                                                const margem = maxVal > 0 ? (totEdit.empresaGD / maxVal) : 0

                                                if (margem === 0) return "-"

                                                const pct = Math.round(margem * 100)
                                                let color = "text-red-600"
                                                if (pct >= 15) color = "text-green-600"
                                                else if (pct >= 10) color = "text-yellow-600"

                                                return <span className={`font-bold ${color}`}>{pct}%</span>
                                            })()}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>


                            </Table>
                        </CardContent>
                    </Card>

                    {/* Telhas – valores fixos */}
                    <Card className="shadow-sm">
                        <CardHeader className="p-3">
                            <CardTitle className="text-sm">Telhas – valores fixos*</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-bege">
                                        <TableHead>Tipo</TableHead>
                                        <TableHead className="text-right">Pix</TableHead>
                                        <TableHead className="text-right">10×</TableHead>
                                        <TableHead className="text-right">18×</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {telhaTipos.map((tipo) => {
                                        const v = ensureTelha(tipo)
                                        const group = getTileGroup(tipo)

                                        // Lógica de destaque (maior preço do grupo)
                                        // Precisamos saber se este 'tipo' é o mais caro do seu grupo
                                        let isMostExpensive = false
                                        if (group) {
                                            // Filtra todos dste grupo
                                            const sameGroup = telhaTipos.filter(t => getTileGroup(t) === group)
                                            // Encontra o maior preço pix
                                            const maxPix = Math.max(...sameGroup.map(t => ensureTelha(t).pix))
                                            // Se o atual for igual ao max
                                            if (v.pix > 0 && v.pix >= maxPix) {
                                                isMostExpensive = true
                                            }
                                        }

                                        const styleRow = isMostExpensive ? "bg-yellow-50 font-medium" : ""

                                        return (
                                            <TableRow key={tipo} className={styleRow}>
                                                <TableCell className="flex items-center gap-2">
                                                    {group && (
                                                        <div
                                                            className={`w-3 h-3 rounded-full ${GROUP_CONFIG[group].color}`}
                                                            title={`Grupo: ${group}`}
                                                        />
                                                    )}
                                                    {tipo}
                                                    {isMostExpensive && (
                                                        <Badge variant="outline" className="ml-auto text-[10px] h-5 px-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                                                            Maior Valor
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{formatBR(v.pix)}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.x10)}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.x18)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>

                            </Table>
                            <p className="mt-2 text-xs text-marromEscuro/60">
                                * A proposta ira com o valor maior de cada grupo de telha para preservar a margem de lucro
                            </p>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            {/* ---------------------------------------------------------------
       *                          ETAPA 4
       * --------------------------------------------------------------- */}
            <Card className="mt-4">
                <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Etapa 4</Badge>
                        <CardTitle className="text-lg">Gerar Proposta</CardTitle>
                    </div>
                    <CardDescription className="text-sm mt-1 text-black">
                        Ao gerar, a proposta será criada e os links aparecerão abaixo. O título pode ser automático ou manual.
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-4 space-y-5">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                className="bg-bege text-marromEscuro hover:bg-marromEscuro/90 min-w-[140px]"
                                onClick={onClickGerarAgora}
                                disabled={loadingPDF}
                            >
                                {loadingPDF ? "Gerando…" : "Gerar Proposta"}
                            </Button>

                            <span className="text-xs text-marromEscuro/70">Salva automaticamente</span>

                        </div>
                    </div>

                    <div className="grid gap-5">

                        {/* Link do Slide */}
                        <div className="grid gap-2">
                            <Label className="text-sm">Link do Slide</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="bg-bege text-marromEscuro hover:bg-bege/80"
                                    disabled={!links.slide}
                                    title={links.slide ? "Abrir em nova aba" : "Sem link ainda"}
                                    onClick={() =>
                                        links.slide && window.open(links.slide, "_blank", "noopener,noreferrer")
                                    }
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                </Button>

                                <Input
                                    value={links.slide ?? ""}
                                    onChange={(e) => setLinks((prev) => ({ ...prev, slide: e.target.value }))}
                                    placeholder="Cole ou gere o link do slide"
                                    className="flex-1"
                                />

                                {/* aqui usamos o botão reaproveitável */}
                                <CopyLinkButton value={links.slide ?? ""} label="Copiar link do Slide" />
                            </div>
                        </div>

                        {/* Link do PDF */}
                        <div className="grid gap-2">
                            <Label className="text-sm">Link do PDF</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="bg-bege text-marromEscuro hover:bg-bege/80"
                                    disabled={!links.pdf}
                                    title={links.pdf ? "Abrir em nova aba" : "Sem link ainda"}
                                    onClick={() =>
                                        links.pdf && window.open(links.pdf, "_blank", "noopener,noreferrer")
                                    }
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                </Button>

                                <Input
                                    value={links.pdf ?? ""}
                                    onChange={(e) => setLinks((prev) => ({ ...prev, pdf: e.target.value }))}
                                    placeholder="Cole ou gere o link do PDF"
                                    className="flex-1"
                                />

                                {/* aqui também */}
                                <CopyLinkButton value={links.pdf ?? ""} label="Copiar link do PDF" />
                            </div>
                        </div>


                    </div>
                </CardContent>
            </Card>

            {/* ---------------------------------------------------------------
       *                       Botões finais + Modal
       * --------------------------------------------------------------- */}
            <div className="flex justify-between mt-4">
                <Button variant="secondary" onClick={() => router.push("/")}>
                    Voltar
                </Button>
            </div>

            {/* Modal de título / salvar / gerar / salvar_copia */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md space-y-4">
                        <h2 className="text-lg font-semibold">Confirme o título do orçamento</h2>

                        <div className="flex flex-col gap-1">
                            <Label>Título</Label>
                            <Input value={tituloTemporario} onChange={e => setTituloTemporario(e.target.value)} />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowModal(false)
                                    setModalMode(null)
                                    setTituloTemporario("")
                                }}
                            >
                                Cancelar
                            </Button>

                            <Button
                                variant="success"
                                onClick={async () => {
                                    if (!tituloTemporario.trim()) return
                                    setTitulo(tituloTemporario)
                                    setShowModal(false)

                                    // CREATE: manter comportamento existente
                                    if (modalMode === "salvar" && !isEdit) {
                                        try {
                                            if (!ensureClienteAssociado()) return
                                            setLoadingSave(true)
                                            const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)
                                            const payloadRascunho = {
                                                clienteId: Number(clienteId),
                                                cliente: form,
                                                parametros: { tipoObra: tipoObra ?? "", ...dim },
                                                materiais,
                                                totais: totEdit,
                                                telhaValores: telhaValoresAtual,
                                                titulo: tituloTemporario,
                                                fornecedorId: fornecedorSel ? Number(fornecedorSel) : null,
                                                observacoes: (observacoes || "").trim() || null,
                                            }
                                            console.log("payload create (rascunho)", payloadRascunho)
                                            const novoId = await salvarRascunhoAPI(payloadRascunho)

                                            await logOrcamentoWebhook({
                                                acao: "CRIAR_RASCUNHO_ORCAMENTO",
                                                orcamentoId: novoId,
                                                titulo: tituloTemporario,
                                                cliente: buildClienteLog(),
                                                usuario: usuarioLog,
                                                dadosOrcamento: payloadRascunho,
                                            })

                                            toast.success("Rascunho salvo com sucesso!")
                                            setModalSucessoAberto(true)
                                        } catch (err: unknown) {
                                            const msg = err instanceof Error ? err.message : "Erro ao salvar rascunho"
                                            toast.error(msg)
                                        } finally {
                                            setLoadingSave(false)
                                        }
                                        return
                                    }

                                    // EDIT: salvar atualização (UPDATE)
                                    if (modalMode === "salvar" && isEdit) {
                                        try {
                                            if (!orcamentoId) throw new Error("ID do orçamento ausente.")
                                            setLoadingSave(true)
                                            const payloadUpdate: UpdateOrcamentoInput = {
                                                ...buildDbPayload(),
                                                titulo: tituloTemporario.trim(),
                                            }
                                            await updateOrcamentoAPI(orcamentoId, payloadUpdate)

                                            await logOrcamentoWebhook({
                                                acao: "EDITAR_ORCAMENTO",
                                                orcamentoId,
                                                titulo: tituloTemporario.trim(),
                                                cliente: buildClienteLog(),
                                                usuario: usuarioLog,
                                                dadosOrcamento: payloadUpdate,
                                            })

                                            toast.success("Orçamento atualizado com sucesso!")
                                        } catch (err: unknown) {
                                            const msg = err instanceof Error ? err.message : "Erro ao atualizar orçamento"
                                            toast.error(msg)
                                        } finally {
                                            setLoadingSave(false)
                                        }
                                        return
                                    }

                                    // EDIT: salvar cópia (INSERT novo) — agora com redirecionamento
                                    if (modalMode === "salvar_copia" && isEdit) {
                                        try {
                                            if (!ensureClienteAssociado()) return
                                            setLoadingSave(true)
                                            const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)

                                            // se não tiver links, gravamos como rascunho; se tiver, como definitivo
                                            if (links.slide || links.pdf) {
                                                const payloadCopia = {
                                                    clienteId: Number(clienteId),
                                                    cliente: form,
                                                    parametros: { tipoObra: tipoObra ?? "", ...dim },
                                                    materiais,
                                                    totais: totEdit,
                                                    telhaValores: telhaValoresAtual,
                                                    links: { slideUrl: links.slide ?? "", pdfUrl: links.pdf ?? "" },
                                                    titulo: tituloTemporario,
                                                    fornecedorId: fornecedorSel ? Number(fornecedorSel) : null,
                                                    observacoes: (observacoes || "").trim() || null,
                                                }
                                                const novoId = await salvarOrcamentoAPI(payloadCopia)

                                                await logOrcamentoWebhook({
                                                    acao: "CRIAR_COPIA_ORCAMENTO",
                                                    orcamentoId: novoId,
                                                    titulo: tituloTemporario,
                                                    cliente: buildClienteLog(),
                                                    usuario: usuarioLog,
                                                    dadosOrcamento: payloadCopia,
                                                })

                                                toast.success("Cópia salva como novo orçamento!")
                                                router.push(`/orcamento/edit/${novoId}`) // <<<<<< REDIRECIONA PARA A CÓPIA
                                            } else {
                                                const payloadCopiaRascunho = {
                                                    clienteId: Number(clienteId),
                                                    cliente: form,
                                                    parametros: { tipoObra: tipoObra ?? "", ...dim },
                                                    materiais,
                                                    totais: totEdit,
                                                    telhaValores: telhaValoresAtual,
                                                    titulo: tituloTemporario,
                                                    fornecedorId: fornecedorSel ? Number(fornecedorSel) : null,
                                                    observacoes: (observacoes || "").trim() || null,
                                                }
                                                const novoId = await salvarRascunhoAPI(payloadCopiaRascunho)

                                                await logOrcamentoWebhook({
                                                    acao: "CRIAR_COPIA_ORCAMENTO",
                                                    orcamentoId: novoId,
                                                    titulo: tituloTemporario,
                                                    cliente: buildClienteLog(),
                                                    usuario: usuarioLog,
                                                    dadosOrcamento: payloadCopiaRascunho,
                                                })

                                                toast.success("Cópia salva como rascunho!")
                                                router.push(`/orcamento/edit/${novoId}`) // <<<<<< REDIRECIONA PARA A CÓPIA (rascunho)
                                            }

                                        } catch (err: unknown) {
                                            const msg = err instanceof Error ? err.message : "Erro ao salvar cópia"
                                            toast.error(msg)
                                        } finally {
                                            setLoadingSave(false)
                                        }
                                        return
                                    }


                                    if (modalMode === "gerar") {
                                        const rawTitle = tituloTemporario.trim().replace(/\s+/g, " ")
                                        const normForCompare = normalize(rawTitle)
                                        setTituloConfirmado(true)
                                        setTituloSnap(normForCompare)
                                        setAutoTituloSnap(normalize(gerarTituloAutomatico()))
                                        await handleGerarProposta(rawTitle)
                                    }

                                }}
                                disabled={!tituloTemporario.trim() || loadingSave || loadingPDF}
                            >
                                Confirmar
                            </Button>

                        </div>
                    </div>
                </div>
            )}

            <ClienteModal
                open={clienteModalOpen}
                mode={clienteModalMode}
                clienteId={clienteModalClienteId ?? undefined}
                prefill={clienteModalPrefill}
                cidades={cidades}
                onClose={() => setClienteModalOpen(false)}
                onSaved={onClienteSaved}
            />


            <ModalSucessoProposta
                open={modalSucessoAberto}
                onClose={() => setModalSucessoAberto(false)}
                slideUrl={links.slide}
                clearAll={clearAll}
            />

        </PageLayout>
    )
}
