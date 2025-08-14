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
} from "lucide-react"

import { Toaster, toast } from "sonner"

import { calcularMateriais } from "@/actions/calcular-materiais/calcularMateriais"
import type { MaterialCalculado } from "@/actions/calcular-materiais/calcularMateriais"

import { calcularTotais } from "@/actions/calculo_totais/calculo_totais"
import { gerarPDF, GerarPDFError } from "@/api/useGerarPDF"
import { getCidades, type Cidade } from "@/actions/cidades-db/cidades-db"
import { salvarOrcamento, salvarRascunhoOrcamento } from "@/actions/salvar-orcamento-db/salvar-orcamento-db"

import { listarMateriaisPorTipo } from "@/actions/materiais-db/materiais-db"
import {
    listarComponentes,
    type Componente,
} from "@/actions/componentes-db/componentes-db"
import {
    listarTiposObra,
    type TipoObra,
} from "@/actions/tipo-obra-db/tipo-obra-db"

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

import { toastByReason } from "@/lib/toast-catalog"
import { guardStep4 } from "@/lib/guards"
import type { ToastReason } from "@/lib/toast-catalog"


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

type Dim = {
    largura: number
    comprimento: number
    larguraMaior: number
    larguraMenor: number
    comprimentoMaior: number
    comprimentoMenor: number
}

type Pagto = { pix: number; x10: number; x18: number }

type OrcamentoPageProps = {
    /** reservado para o futuro (edit) — hoje mantemos create 1:1 */
    mode?: "create"
}

/* ===================================================================
 *                              Helpers
 * =================================================================== */


function getBlockReasonStep4(params: {
    form: { nome: string; telefone: string; cidade?: string | null; bairro?: string | null }
    tipoObra: string | null
    materiais: { madeiras: any[]; materiaisGerais: any[]; telhas: any[] }
    titulo?: string
}): ToastReason | null {
    const { form, tipoObra, materiais } = params
    if (!tipoObra?.trim()) return "missing_city_or_tipoObra"
    if (!form.nome?.trim() || !form.telefone?.trim() || !form.cidade?.trim()) return "missing_client_fields"
    if (!materiais.madeiras?.length) return "materials_required"
    return null
}

const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11)
    if (d.length <= 2) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10)
        return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const formatBR = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const roundUpReal = (v: number) => Math.ceil(v)
const roundUp100 = (v: number) => Math.ceil(v / 100) * 100

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
    }[],
    totalGeral: number,
): Record<"Romana" | "Colonial" | "Americana" | "Maxxi", Pagto> => {
    const somaTipo = (slug: string) =>
        telhasArr
            .filter(t => t.nome.toLowerCase().includes(slug))
            .reduce((s, t) => s + t.quantidade * t.preco, 0)

    const make = (extra: number) => {
        const base = totalGeral + extra
        const pix = roundUp100(base)

        return {
            pix,
            x10: roundUpReal((pix * FATOR_10X) / 10),
            x18: roundUpReal((pix * FATOR_18X) / 18),
        }
    }

    return {
        Romana: make(somaTipo("romana")),
        Colonial: make(somaTipo("colonial")),
        Americana: make(somaTipo("americana")),
        Maxxi: make(somaTipo("maxxi")), // ✅ novo tipo incluído aqui
    }
}

/* ===================================================================
 *                            Componente
 * =================================================================== */
export default function OrcamentoPage({ mode = "create" }: OrcamentoPageProps) {
    const router = useRouter()

    /* ---------------------- Flags/Loaders/Modal ---------------------- */
    const [loadingCalc, setLoadingCalc] = useState(false)
    const [loadingPDF, setLoadingPDF] = useState(false)
    const [loadingSave, setLoadingSave] = useState(false)
    const [hideTotals, setHideTotals] = useState(false)
    const [modalSucessoAberto, setModalSucessoAberto] = useState(false)
    const [slideUrlProposta, setSlideUrlProposta] = useState<string | undefined>()



    /* --------------------------- Catálogos --------------------------- */
    const [catalogo, setCatalogo] = useState<{
        madeiras: { nome: string; preco: number }[]
        materiaisGerais: { nome: string; preco: number }[]
        telhas: { nome: string; preco: number }[]
    }>({ madeiras: [], materiaisGerais: [], telhas: [] })

    const [componentes, setComponentes] = useState<Componente[]>([])
    const [tiposObra, setTiposObra] = useState<TipoObra[]>([])
    const [cidades, setCidades] = useState<Cidade[]>([])

    /* ---------------------- Estado principal (Etapas) ---------------------- */
    const [titulo, setTitulo] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<"salvar" | "gerar" | null>(null)
    const [tituloTemporario, setTituloTemporario] = useState("")

    const [form, setForm] = useState({
        nome: "",
        telefone: "",
        cidade: "",
        bairro: "",
    })

    const [tipoObra, setTipoObra] = useState<string | null>(null)

    const isCobertaL =
        (tipoObra ?? "")
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase() === "coberta em l"

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
    const [links, setLinks] = useState<{ slide?: string; pdf?: string }>({})
    const [tituloConfirmado, setTituloConfirmado] = useState(false)
    const [tituloSnap, setTituloSnap] = useState("")        // título confirmado (normalizado) no momento da confirmação
    const [autoTituloSnap, setAutoTituloSnap] = useState("") // autoTítulo confirmado (normalizado) no momento da confirmação

    const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()



    // habilitação do botão "Gerar agora" (Etapa 4)
    const isStep4Enabled =
        Boolean(tipoObra) &&
        Object.values(form).every(v => v.trim() !== "") &&
        materiais.madeiras.length > 0


    /* ----------------------------- Progresso ----------------------------- */
    const progEtapa1 = (Object.values(form).filter(v => v.trim()).length / 4) * 33
    const progEtapa2 = materiais.madeiras.length ? 34 : 0
    const progresso = Math.round(progEtapa1 + (tipoObra ? 33 : 0) + progEtapa2)

    /* ===================================================================
     *                      Efeitos – carregar catálogos
     * =================================================================== */
    useEffect(() => {
        ; (async () => {
            const [mads, ges, tls, comps, tipos, cids] = await Promise.all([
                listarMateriaisPorTipo("madeira"),
                listarMateriaisPorTipo("geral"),
                listarMateriaisPorTipo("telha"),
                listarComponentes(),
                listarTiposObra(),
                getCidades(),
            ])

            setCatalogo({
                madeiras: mads.map(m => ({ nome: m.descricao, preco: m.preco_unitario })),
                materiaisGerais: ges.map(m => ({ nome: m.descricao, preco: m.preco_unitario })),
                telhas: tls.map(m => ({ nome: m.descricao, preco: m.preco_unitario })),
            })
            setComponentes(comps)
            setTiposObra(tipos)
            setCidades(cids)
        })()
    }, [])

    /* ===================================================================
     *                         Handlers (Etapa 1)
     * =================================================================== */
    const onFormChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setForm(prev => ({
            ...prev,
            [name]: name === "telefone" ? formatPhone(value) : value,
        }))
    }

    const gerarTituloAutomatico = () => {
        const sanitize = (text: string) =>
            text.trim().toLowerCase().replace(/\s+/g, " ").replace(/,/g, "")

        if (!form.nome && !form.bairro && !tipoObra) return ""
        return `${sanitize(form.nome)} ${sanitize(form.bairro)} ${sanitize(tipoObra ?? "")}`.trim()
    }


    const clearAll = () => {
        setForm({ nome: "", telefone: "", cidade: "", bairro: "" })
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
        setTelhaValores({
            Romana: { pix: 0, x10: 0, x18: 0 },
            Colonial: { pix: 0, x10: 0, x18: 0 },
            Americana: { pix: 0, x10: 0, x18: 0 },
            Maxxi: { pix: 0, x10: 0, x18: 0 },
        });
        setTitulo("")
        setTituloTemporario("")
        // —— resets novos ——
        setTituloConfirmado(false)
        setTituloSnap("")
        setAutoTituloSnap("")
        setLinks({})
        localStorage.removeItem(STORAGE_KEY)
    }


    const clearEtapa1 = () => setForm({ nome: "", telefone: "", cidade: "", bairro: "" })

    /* ===================================================================
     *                         Cálculo (Etapa 2)
     * =================================================================== */
    const clearEtapa2 = () => {
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
        resetTotais()
    }

    const toNum = (s?: string | number): number => {
        if (typeof s === "number") return s >= 0 ? s : 0
        if (s === "" || s === undefined || s === null) return 0
        const n = parseFloat(String(s).replace(",", "."))
        return isNaN(n) || n < 0 ? 0 : n
    }

    const toNonNeg = (s?: string | number): number => {
        if (typeof s === "number") return s >= 0 ? s : 0
        if (s === "" || s === undefined || s === null) return 0
        const n = parseFloat(String(s).replace(",", "."))
        return isNaN(n) || n < 0 ? 0 : n
    }

    const calcular = async (): Promise<void> => {
        if (!tipoObra || loadingCalc) return
        setLoadingCalc(true)
        try {
            const { madeira, materiais: mats, telhas } = await calcularMateriais(
                tipoObra,
                dim.largura,
                dim.comprimento,
            )

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
            const telhasNew = telhas.map(mapRow)

            setMateriais({
                madeiras: madeirasNew,
                materiaisGerais: materGNew,
                telhas: telhasNew,
            })

            const madeirasSubtotal = subtotalMadeiras(madeirasNew)
            const materiaisSubtotal = subtotalGeral(materGNew)
            const { maoDeObra, empresaGD } = calcularTotais({ tipoObra })


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

    // 🔧 reseta o <Select> de inclusão após cada escolha
    const [addResetKey, setAddResetKey] = useState<Record<Categoria, number>>({
        madeiras: 0,
        materiaisGerais: 0,
        telhas: 0,
    });


    const startEdit = (c: Categoria, m: Material) => {
        setEdit({ cat: c, id: m.id })
        setEditData({
            ...m,
            tamanho: m.tamanho !== undefined && m.tamanho !== null ? String(m.tamanho) : "",
            frete: m.frete ?? 0,
        })
    }

    const saveEdit = () => {
        if (!edit) return;

        // 🔧 validações (obrigatórios)
        if (!editData.nome?.trim()) {
            toast.error("Preencha a descrição/madeira antes de salvar.");
            return;
        }
        if (edit.cat === "madeiras" && !editData.componente?.trim()) {
            toast.error("Preencha o Componente antes de salvar.");
            return;
        }

        const tamanho = toNum(editData.tamanho);
        const quantidade = toNum(editData.quantidade);
        const preco = toNonNeg(editData.preco);
        const frete = toNonNeg(editData.frete);

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
        }));

        toast.success(
            `Edição na tabela ${{ madeiras: "Madeiras", materiaisGerais: "Materiais Gerais", telhas: "Telhas" }[edit.cat]
            } salva com sucesso!`,
        );

        setEdit(null);
    };


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
    // onde declara os subtotais
    const subtotalMadeiras = (arr: Material[]) =>
        arr.reduce((s, m) => s + toNum(m.tamanho) * toNonNeg(m.quantidade) * toNonNeg(m.preco), 0)


    const subtotalGeral = (arr: Material[]) =>
        arr.reduce((s, m) => s + m.quantidade * m.preco, 0)

    const totMadeiras = subtotalMadeiras(materiais.madeiras)
    const totMateriais = subtotalGeral(materiais.materiaisGerais)
    const totCalc = { madeiras: totMadeiras, materiais: totMateriais }

    const [totEdit, setTotEdit] = useState(() => ({
        ...totCalc,
        comissao: 0,
        frete: 0,
        empresaPS: 0,
        empresaGD: 0,
    }))

    const [editingTot, setEditingTot] = useState<keyof typeof totEdit | null>(null)

    const [telhaValores, setTelhaValores] = useState<Record<"Romana" | "Colonial" | "Americana" | "Maxxi", Pagto>>({
        Romana: { pix: 0, x10: 0, x18: 0 },
        Colonial: { pix: 0, x10: 0, x18: 0 },
        Americana: { pix: 0, x10: 0, x18: 0 },
        Maxxi: { pix: 0, x10: 0, x18: 0 },
    })

    useEffect(() => {
        setTotEdit(p => ({
            ...p,
            madeiras: p.madeiras === totMadeiras ? totMadeiras : p.madeiras,
            materiais: p.materiais === totMateriais ? totMateriais : p.materiais,
        }))
    }, [totMadeiras, totMateriais])

    const resetTotais = () => {
        try {
            const madeirasSubtotal = subtotalMadeiras(materiais.madeiras)
            const materiaisSubtotal = subtotalGeral(materiais.materiaisGerais)
            const { maoDeObra, empresaGD } = tipoObra ? calcularTotais({ tipoObra }) : { maoDeObra: 0, empresaGD: 0 }
            setTotEdit({
                madeiras: madeirasSubtotal,
                materiais: materiaisSubtotal,
                comissao: 0,
                frete: 0,
                empresaPS: maoDeObra,
                empresaGD: empresaGD,
            })
            toast.success("Valores resetados com sucesso!")
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Erro ao resetar valores."
            toast.error(msg)
            console.error(err)
        }
    }

    const somaTotal = Object.values(totEdit).reduce((s, v) => s + v, 0)

    useEffect(() => {
        setTelhaValores(calcTelhaValores(materiais.telhas, somaTotal))
    }, [materiais.telhas, somaTotal])

    useEffect(() => {
        setTotEdit(p => ({
            ...p,
            madeiras: totMadeiras,
            materiais: totMateriais,
        }))
    }, [totMadeiras, totMateriais])


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
    const STORAGE_KEY = "orcamento-draft"

    useEffect(() => {
        if (typeof window === "undefined") return
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
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        const draft = { form, tipoObra, dim, materiais, totEdit, telhaValores, titulo }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    }, [form, tipoObra, dim, materiais, totEdit, telhaValores, titulo])

    /* ===================================================================
     *                         Ações finais / Modal
     * =================================================================== */

    const handleGerarProposta = async () => {
        if (loadingPDF) return; // bloqueio real durante loading

        // ⛔ Narrow em runtime: garante string (evita TS "string | null")
        if (!tipoObra) {
            toastByReason("missing_city_or_tipoObra");
            return;
        }

        // validações (dados pessoais, tipo de obra, materiais, título)
        const check = guardStep4({ form, tipoObra, materiais, titulo });
        if (!check.ok) {
            toastByReason(check.reason, { fields: (check as any).fields });
            return;
        }

        setLoadingPDF(true);
        try {
            const result = await gerarPDF({
                cliente: form,
                parametros: { tipoObra, ...dim }, // aqui tipoObra já é string (narrow feito acima)
                materiais,
                totais: totEdit,
                telhaValores,
                titulo,
            });

            // util para aceitar várias convenções de chave
            const pick = (obj: any, keys: string[]) => {
                for (const k of keys) {
                    const v = obj?.[k];
                    if (typeof v === "string" && v.trim()) return v as string;
                }
                return "";
            };

            // aceita retorno como array ou objeto; usa `any` local p/ evitar erro de TS no `.data`
            const srcAny: any = Array.isArray(result) ? result?.[0] : result;

            const slide =
                pick(srcAny, ["slideUrl", "slide", "slide_url", "link_slide", "slideLink", "url_slide"]) ||
                pick(srcAny?.data, ["slideUrl", "slide", "slide_url", "link_slide", "slideLink", "url_slide"]);

            const pdf =
                pick(srcAny, ["pdfUrl", "pdf", "pdf_url", "link_pdf", "pdfLink", "url_pdf"]) ||
                pick(srcAny?.data, ["pdfUrl", "pdf", "pdf_url", "link_pdf", "pdfLink", "url_pdf"]);

            setLinks({ slide: slide || undefined, pdf: pdf || undefined });

            if (slide && pdf) {
                toast.success("Proposta gerada! Links prontos abaixo.");
            } else if (slide || pdf) {
                const ok = slide ? "slide" : "PDF";
                const missing = slide ? "PDF" : "slide";
                toast.warning(`Proposta gerada parcialmente: ${ok} encontrado, ${missing} ausente.`, {
                    description: "Tente gerar novamente ou verifique sua conexão.",
                });
            } else {
                toast.warning("Proposta gerada, mas sem links detectados.", {
                    description: "Verifique o retorno do servidor e tente novamente.",
                });
                console.debug("[handleGerarProposta] retorno sem links reconhecidos:", result);
            }
        } catch (err: unknown) {
            if (err instanceof GerarPDFError) {
                const code = err.status ? `(${err.status}) ` : "";
                toast.error(`${code}${err.title}`, { description: (err as any).detail });
                console.error((err as any).detail ?? err);
            } else if (err instanceof Error) {
                toast.error(err.message);
                console.error(err);
            } else {
                toast.error("Erro desconhecido.");
                console.error(err);
            }
        } finally {
            setLoadingPDF(false);
        }
    };




    const onClickGerarAgora = () => {
        if (!isStep4Enabled || loadingPDF) return

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

    const abrirModalGerar = () => {
        const preenchido = Object.values(form).every(v => v.trim() !== "")
        const temMateriais = materiais.madeiras.length > 0
        if (!preenchido || !tipoObra || !temMateriais) return

        setModalMode("gerar")
        setTituloTemporario(titulo || gerarTituloAutomatico())
        setShowModal(true)
    }

    /* ===================================================================
     *                              JSX
     * =================================================================== */
    return (
        <PageLayout
            links={[
                { label: "Home", href: "/" },
                { label: "Gerar Orçamento", href: "/gerar-orcamento" },
            ]}
        >
            <Toaster position="top-right" richColors closeButton />


            {/* ---------------------------------------------------------------
       *                          Cabeçalho
       * --------------------------------------------------------------- */}
            <Card className="mb-4 shadow-md rounded-2xl">
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold whitespace-nowrap">
                            Gerar Orçamento
                        </CardTitle>

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
                        <Label>Nome</Label>
                        <Input name="nome" placeholder="Ex.: João Luiz" value={form.nome} onChange={onFormChange} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label>Telefone</Label>
                        <Input name="telefone" placeholder="Ex.: (85) 98765-4321" value={form.telefone} onChange={onFormChange} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label>Cidade</Label>
                        <Select
                            value={form.cidade || undefined}
                            onValueChange={v => setForm(prev => ({ ...prev, cidade: v }))}
                        >
                            <SelectTrigger className="w-full">
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
                        <Label>Bairro</Label>
                        <Input name="bairro" placeholder="Ex.: Meireles" value={form.bairro} onChange={onFormChange} />
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
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearEtapa2}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash className="h-4 w-4 mr-1" /> Limpar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-4 space-y-6">
                    {/* Filtros / parâmetros */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <Label>Tipo de Obra</Label>
                            <Select value={tipoObra ?? undefined} onValueChange={v => setTipoObra(v)}>
                                <SelectTrigger className="w-56">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tiposObra.map(t => (
                                        <SelectItem key={t.id} value={t.tipo_obra}>
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
                                        min={0}                 // 🔧 não-negativo
                                        step={0.5}
                                        value={dim[k]}
                                        onChange={(e) => {
                                            const v = Math.max(0, Number(e.target.value));
                                            setDim(p => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }));
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
                                        min={0}                 // 🔧 não-negativo
                                        step={0.5}
                                        value={dim[k]}
                                        onChange={(e) => {
                                            const v = Math.max(0, Number(e.target.value));
                                            setDim(p => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }));
                                        }}
                                        className="w-32"
                                    />
                                </div>
                            ))
                        )}

                        {(() => {
                            const calcReason = !tipoObra ? ("missing_city_or_tipoObra" as const) : null
                            const visuallyDisabled = Boolean(calcReason || loadingCalc)

                            return (
                                <Button
                                    onClick={(e) => {
                                        if (loadingCalc) return // bloqueio real
                                        if (calcReason) {
                                            e.preventDefault()
                                            toastByReason(calcReason, { hint: "Selecione o tipo de obra para calcular." })
                                            return
                                        }
                                        void calcular()
                                    }}
                                    // aparência de desabilitado sem bloquear o clique quando for validação
                                    aria-disabled={visuallyDisabled}
                                    data-disabled={visuallyDisabled ? "" : undefined}
                                    className={`min-w-[132px] ${visuallyDisabled ? "opacity-50 cursor-not-allowed pointer-events-auto" : ""}`}
                                    // usar disabled real apenas no loading
                                    disabled={loadingCalc}
                                >
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
                            )
                        })()}
                    </div>

                    {/* Tabelas por categoria */}
                    {([
                        ["madeiras", "Madeiras"],
                        ["materiaisGerais", "Materiais Gerais"],
                        ["telhas", "Telhas"],
                    ] as [Categoria, string][]).map(([cat, titulo]) => (
                        <div key={cat} className="border rounded-lg shadow-sm">
                            {/* Cabeçalho da tabela */}
                            <div className="flex justify-between items-center px-3 py-2 bg-bege rounded-t-lg">
                                <span className="font-medium text-sm">{titulo}</span>

                                {/* seletor “+ Adicionar” – reseta após cada inclusão */}
                                <Select
                                    key={addResetKey[cat]} // 🔧 força o reset do componente
                                    onValueChange={(v) => {
                                        addMaterial(cat, v);
                                        setAddResetKey(s => ({ ...s, [cat]: s[cat] + 1 })); // 🔧 permite repetir o mesmo item
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
                                                {cat === "madeiras" ? "Preço (m²)" : "Preço (un)"}
                                            </TableHead>
                                            {cat === "telhas" && (
                                                <TableHead className="w-28 text-right">Frete</TableHead>
                                            )}
                                            <TableHead className="w-28 text-right">Total</TableHead>
                                            <TableHead className="w-20 text-center">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {materiais[cat].map((m) => {
                                            const ed = edit?.cat === cat && edit.id === m.id

                                            // 👇 usa valores "em edição" quando estiver editando
                                            const tam = toNum(ed ? editData.tamanho : m.tamanho)
                                            const qtd = toNonNeg(ed ? editData.quantidade : m.quantidade)
                                            const preco = toNonNeg(ed ? editData.preco : m.preco)
                                            const frete = toNonNeg(ed ? (editData.frete ?? 0) : (m.frete ?? 0))

                                            const total =
                                                cat === "madeiras"
                                                    ? tam * qtd * preco
                                                    : cat === "telhas"
                                                        ? qtd * preco + frete
                                                        : qtd * preco

                                            return (
                                                <TableRow key={m.id}>
                                                    {cat === "madeiras" ? (
                                                        <>
                                                            {/* Componente */}
                                                            <TableCell>
                                                                {ed ? (
                                                                    <Select
                                                                        value={editData.componente || ""}
                                                                        onValueChange={(v) =>
                                                                            setEditData((d) => ({ ...d, componente: v }))
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {componentes.map((c) => (
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
                                                                        onValueChange={(v) => {
                                                                            const ref = catalogo[cat].find((o) => o.nome === v)
                                                                            setEditData((d) => ({
                                                                                ...d,
                                                                                nome: v,
                                                                                preco: ref ? ref.preco : d.preco,
                                                                            }))
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {catalogo[cat].map((o) => (
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
                                                                        onChange={(e) => {
                                                                            const v = Math.max(0, Number(e.target.value))
                                                                            setEditData((d) => ({
                                                                                ...d,
                                                                                quantidade: Number.isFinite(v) ? v : 0,
                                                                            }))
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
                                                                        onChange={(e) =>
                                                                            setEditData((d) => ({ ...d, tamanho: e.target.value }))
                                                                        }
                                                                        onBlur={(e) => {
                                                                            const raw = e.target.value.replace(",", ".")
                                                                            const v = Math.max(0, parseFloat(raw) || 0)
                                                                            setEditData((d) => ({ ...d, tamanho: String(v) }))
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
                                                            <TableCell>{m.nome}</TableCell>
                                                            <TableCell className="text-right">
                                                                {ed ? (
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step={1}
                                                                        value={editData.quantidade}
                                                                        onChange={(e) => {
                                                                            const v = Math.max(0, Number(e.target.value))
                                                                            setEditData((d) => ({
                                                                                ...d,
                                                                                quantidade: Number.isFinite(v) ? v : 0,
                                                                            }))
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
                                                                onChange={(e) => {
                                                                    const v = Math.max(0, Number(e.target.value))
                                                                    setEditData((d) => ({
                                                                        ...d,
                                                                        preco: Number.isFinite(v) ? v : 0,
                                                                    }))
                                                                }}
                                                                className="h-8 text-right"
                                                            />
                                                        ) : (
                                                            formatBR(m.preco)
                                                        )}
                                                    </TableCell>

                                                    {/* Frete (só para telhas) */}
                                                    {cat === "telhas" && (
                                                        <TableCell className="text-right">
                                                            {ed ? (
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    step={0.01}
                                                                    value={editData.frete ?? 0}
                                                                    onChange={(e) => {
                                                                        const v = Math.max(0, Number(e.target.value))
                                                                        setEditData((d) => ({
                                                                            ...d,
                                                                            frete: Number.isFinite(v) ? v : 0,
                                                                        }))
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
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => startEdit(cat, m)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => removeItem(cat, m.id)}
                                                                >
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-marromEscuro"
                                        onClick={() => setHideTotals(p => !p)}
                                    >
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
                                    {(Object.entries(totEdit) as [keyof typeof totEdit, number][]).map(([k, v]) => (
                                        <TableRow key={k}>
                                            <TableCell>{displayLabel[k]}</TableCell>

                                            <TableCell className="pr-0">
                                                <div className="flex justify-end items-center">
                                                    {editingTot === k ? (
                                                        <Input
                                                            type="number"
                                                            value={v}
                                                            onChange={e => setTotEdit(p => ({ ...p, [k]: +e.target.value }))}
                                                            className="w-24 h-8 text-right"
                                                        />
                                                    ) : hideTotals ? (
                                                        "••••••"
                                                    ) : (
                                                        formatBR(v)
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right w-12">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setEditingTot(editingTot === k ? null : k)}
                                                >
                                                    {editingTot === k ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                                </Button>
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
                                    {Object.entries(telhaValores).map(([tipo, v]) => (
                                        <TableRow key={tipo}>
                                            <TableCell>{tipo}</TableCell>
                                            <TableCell className="text-right">{formatBR(v.pix)}</TableCell>
                                            <TableCell className="text-right">{formatBR(v.x10)}</TableCell>
                                            <TableCell className="text-right">{formatBR(v.x18)}</TableCell>
                                        </TableRow>
                                    ))}
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
                        {(() => {
                            const reason = getBlockReasonStep4({ form, tipoObra, materiais, titulo })
                            const visuallyDisabled = Boolean(reason || loadingPDF)

                            return (
                                <div className="flex items-center gap-2">
                                    <Button
                                        className={`bg-bege text-marromEscuro hover:bg-marromEscuro/90 min-w-[140px] ${visuallyDisabled ? "opacity-50 cursor-not-allowed pointer-events-auto" : ""
                                            }`}
                                        onClick={(e) => {
                                            if (loadingPDF) return // bloqueio real
                                            if (reason) {
                                                e.preventDefault()
                                                toastByReason(reason, { hint: "Complete os campos para gerar a proposta." })
                                                return
                                            }
                                            void handleGerarProposta() // segue fluxo normal
                                        }}
                                        // usar disabled real só quando for loading
                                        disabled={loadingPDF}
                                        aria-disabled={visuallyDisabled}
                                        data-disabled={visuallyDisabled ? "" : undefined}
                                    >
                                        {loadingPDF ? "Gerando…" : "Gerar Proposta"}
                                    </Button>

                                </div>
                            )
                        })()}



                        {!isStep4Enabled && (
                            <span className="text-xs text-muted-foreground">
                                Complete as etapas anteriores para habilitar.
                            </span>
                        )}
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
                                    onClick={() => links.slide && window.open(links.slide, "_blank", "noopener,noreferrer")}
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                </Button>

                                <Input
                                    value={links.slide ?? ""}
                                    disabled
                                    readOnly
                                    placeholder="Gere para exibir o link do slide"
                                />
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
                                    onClick={() => links.pdf && window.open(links.pdf, "_blank", "noopener,noreferrer")}
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                </Button>

                                <Input
                                    value={links.pdf ?? ""}
                                    disabled
                                    readOnly
                                    placeholder="Gere para exibir o link do PDF"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* ---------------------------------------------------------------
       *                       Botões finais + Modal
       * --------------------------------------------------------------- */}
            <div className="flex justify-between mt-4">
                <Button variant="secondary" onClick={() => router.push("/")}>Voltar</Button>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={loadingSave || loadingPDF}
                        onClick={abrirModalSalvar}
                        className="min-w-[110px]"
                    >
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

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md space-y-4">
                        <h2 className="text-lg font-semibold">Confirme o título do orçamento</h2>

                        <div className="flex flex-col gap-1">
                            <Label>Título</Label>
                            <Input
                                value={tituloTemporario}
                                onChange={e => setTituloTemporario(e.target.value)}
                            />

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

                                    if (modalMode === "salvar") {
                                        try {
                                            setLoadingSave(true)
                                            await salvarRascunhoOrcamento({
                                                cliente: form,
                                                parametros: { tipoObra: tipoObra ?? "", ...dim },
                                                materiais,
                                                totais: totEdit,
                                                telhaValores,
                                                titulo: tituloTemporario,
                                            })
                                            toast.success("Rascunho salvo com sucesso!")
                                            setModalSucessoAberto(true) // <- abre o modal no salvar
                                        } catch (err: unknown) {
                                            const msg = err instanceof Error ? err.message : "Erro ao salvar rascunho"
                                            toast.error(msg)
                                        } finally {
                                            setLoadingSave(false)
                                        }
                                        return
                                    }

                                    if (modalMode === "gerar") {
                                        // marca como confirmado e guarda snapshots para invalidação futura
                                        setTituloConfirmado(true)
                                        setTituloSnap(normalize(tituloTemporario))
                                        setAutoTituloSnap(normalize(gerarTituloAutomatico()))
                                        await handleGerarProposta()
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
