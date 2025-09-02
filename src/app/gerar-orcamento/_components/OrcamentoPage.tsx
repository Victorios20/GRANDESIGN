// src/components/orcamento/OrcamentoPage.tsx
"use client"

import { useState, useEffect, ChangeEvent } from "react"

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
} from "lucide-react"
import { Toaster, toast } from "sonner"

import { calcularMateriais } from "@/actions/calcular-materiais/calcularMateriais"
import type { MaterialCalculado } from "@/actions/calcular-materiais/calcularMateriais"

import CopyLinkButton from "@/components/ui/CopyLinkButton"


import { calcularTotais } from "@/actions/calculo_totais/calculo_totais"
import { gerarPDF, GerarPDFError } from "@/api/useGerarPDF"


import type { UpdateOrcamentoInput } from "@/actions/edit-orcamento-db/edit-orcamento-db"

import { PageLayout } from "@/components/ui/pageLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import ModalSucessoProposta from "@/components/ui/ModalSucessoProposta"

import { aplicarFreteTelhasPorCidade } from "@/lib/regra-frete-telhas"

/* ===================================================================
 *                                Tipos
 * =================================================================== */
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


type LinksState = { slide?: string; pdf?: string }

export type InitialData = {
    id: number
    titulo: string
    cliente: { nome: string; telefone: string; bairro: string; cidade: string }
    parametros: {
        tipoObra: string
        // Podem não existir (caso Coberta em L)
        largura?: number | null
        comprimento?: number | null

        // Novos campos da Coberta em L (opcionais)
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
    // aceitamos ambos os formatos
    links: { slide?: string; pdf?: string; slideUrl?: string | null; pdfUrl?: string | null }
}

type Catalogo = {
    madeiras: { nome: string; preco: number }[]
    materiaisGerais: { nome: string; preco: number }[]
    telhas: { nome: string; preco: number }[]
}


// COLE este bloco NO MESMO LUGAR
type BaseProps = {
    // catálogos SEMPRE vêm por props
    catalogo: Catalogo
    componentes: Componente[]
    tiposObra: TipoObra[]
    cidades: Cidade[]
}

// "create": pode omitir mode (default "create"); NÃO tem id nem initialData
type CreateProps = BaseProps & {
    mode?: "create"
}

// "edit": é obrigatório mode="edit" E também orcamentoId + initialData
type EditProps = BaseProps & {
    mode: "edit"
    orcamentoId: number
    initialData: InitialData
}

// contrato final: union discriminada
type OrcamentoPageProps = CreateProps | EditProps


/* ===================================================================
 *                              Helpers
 * =================================================================== */
// ------------------ Helpers de POST para API ------------------
// ADICIONE AQUI (abaixo do cabeçalho "Helpers de POST para API")
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
            tamanho?: number | string | null | undefined   // <— relaxado
            frete?: number | null | undefined              // <— relaxado
        }[]
        materiaisGerais: { nome: string; quantidade: number; preco: number }[]
        telhas: { nome: string; quantidade: number; preco: number; frete?: number | null | undefined }[]
    }
    totais: TotaisPayload
    telhaValores: Record<string, Pagto>
    links?: { slideUrl: string | null; pdfUrl: string | null }
    titulo: string
}

// SUBSTITUA a função postJSON atual por esta
async function postJSON<T>(url: string, data: unknown): Promise<T> {
    const r = await fetch(url, {
        method: "POST",
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
                // log estruturado p/ DevTools
                console.error("[API ERROR]", { url, status: r.status, ...j })
            } catch {
                // fallback silencioso
            }
        } else {
            try { extra = `: ${await r.text()}` } catch { }
        }
        throw new Error(`Falha ao salvar (${r.status})${extra}`)
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

const updateOrcamentoAPI = (id: number, payload: UpdateOrcamentoInput) =>
    putJSON<{ ok: true }>(`/api/Orcamentos/${id}`, payload).then(() => true)



const salvarOrcamentoAPI = (payload: SalvarPayload) =>
    postJSON<{ id: number }>("/api/Orcamentos", payload).then(r => r.id)

const salvarRascunhoAPI = (payload: SalvarPayload) =>
    postJSON<{ id: number }>("/api/Orcamentos/rascunho", payload).then(r => r.id)




// Cores mais fortes por ID
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





// IDs canônicos pros campos (pra scroll/focus rápido)
const FIELD_IDS = {
    nome: "inp-nome",
    telefone: "inp-telefone",
    cidade: "inp-cidade",
    bairro: "inp-bairro",
    tipoObra: "inp-tipo-obra",
    madeiras: "tbl-madeiras",
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

// Normalização + formatação
const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()
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

// fatores de acréscimo do cartão
const FATOR_10X = 1.1457 // 14,57 %
const FATOR_18X = 1.2385 // 23,85 %

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

    // narrowing correto em cima de props.mode
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

    // (opcional) manter uma variável mode se você usa em outros lugares
    const mode: "create" | "edit" = isEdit ? "edit" : "create"



    // reseta Selects quando limpa
    const [cityResetKey, setCityResetKey] = useState(0)
    const [obraResetKey, setObraResetKey] = useState(0)


    const [hydrated, setHydrated] = useState(false)


    /* ---------------------- Flags/Loaders/Modal ---------------------- */
    const [loadingCalc, setLoadingCalc] = useState(false)
    const [loadingPDF, setLoadingPDF] = useState(false)
    const [loadingSave, setLoadingSave] = useState(false)
    const [hideTotals, setHideTotals] = useState(false)
    const [modalSucessoAberto, setModalSucessoAberto] = useState(false)

    /* --------------------------- Catálogos --------------------------- */
    const [catalogo, setCatalogo] = useState<{
        madeiras: { nome: string; preco: number }[]
        materiaisGerais: { nome: string; preco: number }[]
        telhas: { nome: string; preco: number }[]
    }>({ madeiras: [], materiaisGerais: [], telhas: [] })

    const [componentes, setComponentes] = useState<Componente[]>([])
    const [tiposObra, setTiposObra] = useState<TipoObra[]>([])
    const [cidades, setCidades] = useState<Cidade[]>([])

    useEffect(() => {
        setCatalogo(catalogoProp ?? { madeiras: [], materiaisGerais: [], telhas: [] })
        setComponentes(componentesProp ?? [])
        setTiposObra(tiposObraProp ?? [])
        setCidades(cidadesProp ?? [])
    }, [catalogoProp, componentesProp, tiposObraProp, cidadesProp])


    /* ---------------------- Estado principal (Etapas) ---------------------- */
    const [titulo, setTitulo] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<"salvar" | "gerar" | "salvar_copia" | null>(null)
    const [tituloTemporario, setTituloTemporario] = useState("")

    const [form, setForm] = useState({ nome: "", telefone: "", cidade: "", bairro: "" })
    const [tipoObra, setTipoObra] = useState<string | null>(null)

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

        setTitulo(initialData.titulo ?? "")
        setForm({
            nome: initialData.cliente.nome ?? "",
            telefone: initialData.cliente.telefone ?? "",
            bairro: initialData.cliente.bairro ?? "",
            cidade: initialData.cliente.cidade ?? "",
        })
        setTipoObra(initialData.parametros.tipoObra ?? null)
        setDim(prev => ({
            ...prev,
            // se não existir no BD, caem para 0 no front
            largura: Number(initialData.parametros.largura ?? 0),
            comprimento: Number(initialData.parametros.comprimento ?? 0),

            // Coberta em L — também caem para 0 quando ausentes
            larguraMaior: Number(initialData.parametros.larguraMaior ?? 0),
            larguraMenor: Number(initialData.parametros.larguraMenor ?? 0),
            comprimentoMaior: Number(initialData.parametros.comprimentoMaior ?? 0),
            comprimentoMenor: Number(initialData.parametros.comprimentoMenor ?? 0),
        }))

        setMateriais(initialData.materiais)
        setTotEdit(initialData.totais)
        setTelhaValores({ ...initialData.telhaValores }) // usamos como veio do BD
        setLinks({ slide, pdf })

        // garantimos que o título ainda não está "confirmado" até o usuário interagir
        setTituloConfirmado(false)
        setTituloSnap("")
        setAutoTituloSnap("")

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
        const sanitize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ").replace(/,/g, "")
        if (!form.nome && !form.bairro && !tipoObra) return ""
        return `${sanitize(form.nome)} ${sanitize(form.bairro)} ${sanitize(tipoObra ?? "")}`.trim()
    }

    const STORAGE_KEY = "orcamento-draft"

    const clearAll = () => {
        setForm({ nome: "", telefone: "", cidade: "", bairro: "" })
        setCityResetKey(k => k + 1)
        setObraResetKey(k => k + 1)
        setTipoObra(null)
        setDim({
            largura: 1,
            comprimento: 1,
            larguraMaior: 0,
            larguraMenor: 0,
            comprimentoMaior: 0,
            comprimentoMenor: 0,
        })
        setMateriais({ madeiras: [], materiaisGerais: [], telhas: [] })
        setTotEdit({ madeiras: 0, materiais: 0, frete: 0, comissao: 0, empresaPS: 0, empresaGD: 0 })
        setTelhaValores({})
        setTitulo("")
        setTituloTemporario("")
        setTituloConfirmado(false)
        setTituloSnap("")
        setAutoTituloSnap("")
        setLinks({})
        if (!isEdit) localStorage.removeItem(STORAGE_KEY)
    }

    const clearEtapa1 = () => {
        setForm({ nome: "", telefone: "", cidade: "", bairro: "" })
        setCityResetKey(k => k + 1)
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
                // Aceita "Coberta em L" puro ou "Coberta em L - <base>"
                // Se vier com sufixo, o dispatcher já detecta; se vier puro, usa "Linha na Parede 15" por default.
                resultado = await calcularMateriais("Coberta em L", undefined, undefined, {
                    larguraMaior: dim.larguraMaior,
                    comprimentoMaior: dim.comprimentoMaior,
                    larguraMenor: dim.larguraMenor,
                    comprimentoMenor: dim.comprimentoMenor,
                    // tipoBaseL opcional — se quiser expor no UI depois, basta enviar aqui
                })
            } else {
                resultado = await calcularMateriais(tipoObra, dim.largura, dim.comprimento)
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
            const { maoDeObra, empresaGD } = calcularTotais({ tipoObra })

            setTotEdit({
                madeiras: madeirasSubtotal,
                materiais: materiaisSubtotal,
                comissao: 0,
                frete: 0,              // permanece manual/independente
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

    // reseta o <Select> de inclusão após cada escolha
    const [addResetKey, setAddResetKey] = useState<Record<Categoria, number>>({
        madeiras: 0,
        materiaisGerais: 0,
        telhas: 0,
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
            const ref = catalogo[c].find(m => m.nome === nomeSel)
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
    ).sort((a, b) => a.localeCompare(b, "pt-BR"))


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
        if (!raw) return
        try {
            const d = JSON.parse(raw)
            setForm(d.form ?? form)
            setTipoObra(d.tipoObra ?? null)
            setDim(d.dim ?? dim)
            setMateriais(d.materiais ?? materiais)
            setTotEdit(d.totEdit ?? totEdit)
            setTelhaValores(d.telhaValores ?? telhaValores)
            setTitulo(d.titulo ?? "")
        } catch {
            // se JSON quebrado, ignora
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit])

    useEffect(() => {
        if (isEdit || typeof window === "undefined") return
        const draft = { form, tipoObra, dim, materiais, totEdit, telhaValores, titulo }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    }, [isEdit, form, tipoObra, dim, materiais, totEdit, telhaValores, titulo])

    /* ===================================================================
     *                         Handlers (Fluxos)
     * =================================================================== */
    const handleCalcular = () => {
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

        try {
            setLoadingPDF(true)
            const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)
            setTelhaValores(telhaValoresAtual)
            const result = await gerarPDF({
                cliente: form,
                parametros: { tipoObra: tipoObra ?? "", ...dim },
                materiais,
                totais: totEdit,
                // >>> ENVIA MAPA DINÂMICO PARA A HOOK
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
                toast.success("Proposta gerada! Links prontos abaixo.")
                try {
                    setLoadingSave(true)

                    if (isEdit) {
                        if (!orcamentoId) throw new Error("ID do orçamento ausente.")
                        const payload: UpdateOrcamentoInput = {
                            ...buildDbPayload(),
                            links: { slideUrl: slide, pdfUrl: pdf },
                        }
                        await updateOrcamentoAPI(orcamentoId, payload)
                    } else {
                        await salvarOrcamentoAPI({
                            cliente: form,
                            parametros: { tipoObra: tipoObra ?? "", ...dim },
                            materiais,
                            totais: totEdit,
                            telhaValores: telhaValoresAtual,
                            links: { slideUrl: slide, pdfUrl: pdf },
                            titulo: snap,
                        })

                    }

                    toast.success("Orçamento salvo automaticamente.")
                    setModalSucessoAberto(true)
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Erro ao salvar automaticamente"
                    toast.error(msg)
                } finally {
                    setLoadingSave(false)
                }
            } else {
                toast.error("A proposta foi gerada, mas não salvamos porque os links não vieram completos (slide e PDF).")
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
        // monta 'parametros' de forma inteligente
        const parametros: any = { tipoObra: tipoObra ?? "" }

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
            cliente: { ...form },
            parametros, // <<— agora vai o objeto ajustado
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
                { label: pageTitle, href: "/gerar-orcamento" },
            ]}
        >
            <Toaster position="top-right" richColors closeButton />

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
            <Card>
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start sm:items-center">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                Etapa 1
                            </Badge>
                            <CardTitle className="text-lg">Dados Pessoais</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearEtapa1} className="text-red-500 hover:text-red-700">
                            <Trash className="h-4 w-4 mr-1" /> Limpar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <Label htmlFor={FIELD_IDS.nome}>Nome</Label>
                        <Input id={FIELD_IDS.nome} name="nome" placeholder="Ex.: João Luiz" value={form.nome} onChange={onFormChange} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label htmlFor={FIELD_IDS.telefone}>Telefone</Label>
                        <Input id={FIELD_IDS.telefone} name="telefone" placeholder="Ex.: (85) 98765-4321" value={form.telefone} onChange={onFormChange} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label htmlFor={FIELD_IDS.cidade}>Cidade</Label>
                        <Select
                            key={cityResetKey}
                            value={form.cidade || undefined}
                            onValueChange={(v: string) => setForm(prev => ({ ...prev, cidade: v }))}
                        >
                            <SelectTrigger id={FIELD_IDS.cidade} className="w-full">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {cidades.map(c => (
                                    <SelectItem key={c.id} value={c.nome}>
                                        {c.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label htmlFor={FIELD_IDS.bairro}>Bairro</Label>
                        <Input id={FIELD_IDS.bairro} name="bairro" placeholder="Ex.: Meireles" value={form.bairro} onChange={onFormChange} />
                    </div>
                </CardContent>
            </Card>

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
                                            value={t.tipo_obra}              // mantém seu value como está (string)
                                            className={styleForItemId(t.id)} // cor do item via ID
                                        >
                                            {t.tipo_obra}
                                        </SelectItem>
                                    ))}
                                </SelectContent>


                            </Select>
                        </div>

                        {/* Dimensões */}
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
                                <span className="font-medium text-sm">{titulo}</span>

                                {/* seletor “+ Adicionar” – reseta após cada inclusão */}
                                <Select
                                    key={addResetKey[cat]}
                                    onValueChange={v => {
                                        addMaterial(cat, v)
                                        setAddResetKey(s => ({ ...s, [cat]: s[cat] + 1 }))
                                    }}
                                >
                                    <SelectTrigger className="w-52 h-8 text-xs bg-white">
                                        <SelectValue placeholder="+ Adicionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vazio">(linha vazia)</SelectItem>
                                        {catalogo[cat].map(o => (
                                            <SelectItem key={o.nome} value={o.nome}>
                                                {o.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                                                    <Select
                                                                        value={editData.componente || ""}
                                                                        onValueChange={v => setEditData(d => ({ ...d, componente: v }))}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {componentes.map(c => (
                                                                                <SelectItem key={c.id} value={c.nome}>
                                                                                    {c.nome}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    m.componente
                                                                )}
                                                            </TableCell>

                                                            {/* Madeira */}
                                                            <TableCell>
                                                                {ed ? (
                                                                    <Select
                                                                        value={editData.nome || ""}
                                                                        onValueChange={v => {
                                                                            const ref = catalogo[cat].find(o => o.nome === v)
                                                                            setEditData(d => ({ ...d, nome: v, preco: ref ? ref.preco : d.preco }))
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {catalogo[cat].map(o => (
                                                                                <SelectItem key={o.nome} value={o.nome}>
                                                                                    {o.nome}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
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
                                                                    <Select
                                                                        value={editData.nome || ""}
                                                                        onValueChange={(v) => {
                                                                            const ref = catalogo[cat].find(o => o.nome === v)
                                                                            setEditData(d => ({
                                                                                ...d,
                                                                                nome: v,
                                                                                // ao escolher o item, já trazemos o preço do catálogo
                                                                                preco: ref ? ref.preco : d.preco,
                                                                            }))
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {catalogo[cat].map(o => (
                                                                                <SelectItem key={o.nome} value={o.nome}>
                                                                                    {o.nome}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
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
                                </TableBody>


                            </Table>
                        </CardContent>
                    </Card>

                    {/* Telhas – valores fixos */}
                    <Card className="shadow-sm">
                        <CardHeader className="p-3">
                            <CardTitle className="text-sm">Telhas – valores fixos</CardTitle>
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
                                        return (
                                            <TableRow key={tipo}>
                                                <TableCell>{tipo}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.pix)}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.x10)}</TableCell>
                                                <TableCell className="text-right">{formatBR(v.x18)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>

                            </Table>
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
                <div className="flex gap-2">
                    {isEdit && (
                        <Button
                            variant="outline"
                            onClick={abrirModalSalvarCopia}
                            disabled={loadingSave || loadingPDF}
                            className="min-w-[130px]"
                            title="Cria um novo orçamento a partir do que está na tela"
                        >
                            <Copy className="h-4 w-4 mr-1" />
                            Salvar Cópia
                        </Button>
                    )}

                    <Button variant="outline" disabled={loadingSave || loadingPDF} onClick={abrirModalSalvar} className="min-w-[110px]">
                        {loadingSave ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando…
                            </>
                        ) : (
                            "Salvar"
                        )}
                    </Button>
                </div>
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
                                onClick={async () => {
                                    if (!tituloTemporario.trim()) return
                                    setTitulo(tituloTemporario)
                                    setShowModal(false)

                                    // CREATE: manter comportamento existente
                                    if (modalMode === "salvar" && !isEdit) {
                                        try {
                                            setLoadingSave(true)
                                            const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)
                                            await salvarRascunhoAPI({
                                                cliente: form,
                                                parametros: { tipoObra: tipoObra ?? "", ...dim },
                                                materiais,
                                                totais: totEdit,
                                                telhaValores: telhaValoresAtual,
                                                titulo: tituloTemporario,
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
                                            await updateOrcamentoAPI(orcamentoId, buildDbPayload())
                                            toast.success("Orçamento atualizado com sucesso!")
                                        } catch (err: unknown) {
                                            const msg = err instanceof Error ? err.message : "Erro ao atualizar orçamento"
                                            toast.error(msg)
                                        } finally {
                                            setLoadingSave(false)
                                        }
                                        return
                                    }

                                    // EDIT: salvar cópia (INSERT novo)
                                    if (modalMode === "salvar_copia" && isEdit) {
                                        try {
                                            setLoadingSave(true)
                                            // se não tiver links, gravamos como rascunho; se tiver, como definitivo
                                            if (links.slide || links.pdf) {
                                                const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)
                                                await salvarOrcamentoAPI({
                                                    cliente: form,
                                                    parametros: { tipoObra: tipoObra ?? "", ...dim },
                                                    materiais,
                                                    totais: totEdit,
                                                    telhaValores: telhaValoresAtual,
                                                    links: { slideUrl: links.slide ?? "", pdfUrl: links.pdf ?? "" },
                                                    titulo: tituloTemporario,
                                                })
                                                toast.success("Cópia salva como novo orçamento!")
                                            } else {
                                                const telhaValoresAtual = calcTelhaValores(materiais.telhas, somaTotal)
                                                await salvarRascunhoAPI({
                                                    cliente: form,
                                                    parametros: { tipoObra: tipoObra ?? "", ...dim },
                                                    materiais,
                                                    totais: totEdit,
                                                    telhaValores: telhaValoresAtual,
                                                    titulo: tituloTemporario,
                                                })
                                                toast.success("Cópia salva como rascunho!")
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
                                        const snap = normalize(tituloTemporario)
                                        setTituloConfirmado(true)
                                        setTituloSnap(snap)
                                        setAutoTituloSnap(normalize(gerarTituloAutomatico()))
                                        await handleGerarProposta(snap)
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

            <ModalSucessoProposta
                open={modalSucessoAberto}
                onClose={() => setModalSucessoAberto(false)}
                slideUrl={links.slide}
                clearAll={clearAll}
            />


        </PageLayout>
    )
}
