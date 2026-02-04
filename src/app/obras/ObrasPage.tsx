"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Pencil, X, Copy, MoreHorizontal, FileText, FileSignature, ScrollText } from "lucide-react"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import Anexos from "./_sections/Anexos"
import InfosGerais from "./_sections/InfosGerais"
import ObsImagens, { type ImgItem } from "./_sections/ObsImagens"
import Financeiro, { type FinanceiroVM } from "./_sections/Financeiro"
import Execucao, { type ExecucaoVM } from "./_sections/Execucao"

import { PedidoCompraCardSection } from "@/components/obras/pedido-compra/PedidoCompraCardSection"
import type { PedidoCompraVM } from "@/components/obras/pedido-compra/types"

import type { ObraInfosVM, CreateObraPayload, UpdateObraPayload, OrdemServicoPayload } from "./lib/types"
import { createObra, updateObra } from "./lib/api"

import ClienteModal from "@/components/modals/ClienteModal"
import { uploadImagensObra } from "./lib/upload-imagens"
import { gerarContratoN8nESalvar } from "./lib/useGerarContrato"

type Option = { value: string; label: string }
type VM = ObraInfosVM & { imagens?: ImgItem[] }

type CatalogoItem = { nome: string; preco: number }
type Catalogo = {
  madeiras: CatalogoItem[]
  materiaisGerais: CatalogoItem[]
  telhas: CatalogoItem[]
}
type Componente = { id?: number; nome: string; categoria?: string } | any
type Cidade = { id: number; nome: string }

type PedidoCompraDTO = {
  id: number
  categoria: string
  status: string
  fornecedor: { id: number; nome: string } | null
  valores: {
    orcado: number | null
    realizado: number | null
    frete: number | null
  }
  entrega: {
    data: string | null
    endereco: string | null
    receptor: string | null
    telefone: string | null
    maps: string | null
  }
  itens: Array<{
    id: number
    descricao: string
    quantidade: number
    tamanho: number | null
    precoUnitario: number
    total: number
  }>
  descricao?: string | null
  observacoes?: string | null
}

type Props = {
  mode: "new" | "view"
  obraId?: number
  orcamentoId?: number
  ordemServicoId?: number | null
  initial: Partial<ObraInfosVM> & { imagens?: ImgItem[] }
  tiposObraOptions: Option[]
  telhaOptions: Option[]
  pedidoInit?: any
  pedidosCompraInit?: PedidoCompraDTO[]
  catalogo?: Catalogo
  componentes?: Componente[]
  fornecedoresTelhaOptions?: Option[]
  fornecedoresMadeiraOptions?: Option[]
  fornecedoresAndaimesOptions?: Option[]
  financeiroInit?: Partial<FinanceiroVM>
  execucaoInit?: {
    equipeId?: number | null
    dataPrevInicio?: string | null
    dataPrevConclusao?: string | null
  }
  equipeOptions?: Option[]
  anexosInit?: {
    orcamento?: string | null
    proposta?: string | null
    contrato?: string | null
    ordemServico?: string | null
  }
  cidades?: Cidade[]
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function hydrateInfos(initial: Partial<ObraInfosVM> & { imagens?: ImgItem[] }): VM {
  return {
    titulo: initial.titulo ?? undefined,
    tipoObra: initial.tipoObra ?? "",
    largura: initial.largura ?? 0,
    comprimento: initial.comprimento ?? 0,
    telhaEscolhida: initial.telhaEscolhida ?? "",
    status: (initial.status as any) ?? "Assinatura de contrato",
    cliente: {
      nome: initial.cliente?.nome ?? "",
      telefone: initial.cliente?.telefone ?? "",
      cpf: initial.cliente?.cpf ?? "",
      bairro: initial.cliente?.bairro ?? "",
      cidade: initial.cliente?.cidade ?? "",
    },
    endereco: {
      logradouro: initial.endereco?.logradouro ?? "",
      bairro: initial.endereco?.bairro ?? "",
      cidade: initial.endereco?.cidade ?? "",
      mapsUrl: initial.endereco?.mapsUrl ?? "",
    },
    observacoes: initial.observacoes ?? null,
    imagens: initial.imagens ?? [],
  }
}

function normCategoria(raw: string) {
  const s = String(raw ?? "").trim().toUpperCase()
  if (s.includes("TELHA")) return "TELHA"
  if (s.includes("MADEIRA")) return "MADEIRA"
  if (s.includes("ANDAIME")) return "ANDAIMES"
  if (s.includes("MATERIAL")) return "MATERIAIS"
  return s
}

function isEmpty(v: any) {
  if (v === null || v === undefined) return true
  if (typeof v === "string") return v.trim() === ""
  return false
}

function parseMaybeDate(s?: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

function focusById(id: string) {
  if (typeof document === "undefined") return
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    ;(el as HTMLElement).focus?.()
  }
}

function hydrateFinanceiro(fin?: Partial<FinanceiroVM>): FinanceiroVM {
  return {
    valorObra: fin?.valorObra ?? 0,
    maoDeObra: fin?.maoDeObra ?? 0,
    pagamento: {
      entrada: {
        valor: fin?.pagamento?.entrada?.valor ?? 0,
        forma: fin?.pagamento?.entrada?.forma ?? null,
        status: fin?.pagamento?.entrada?.status ?? null,
      },
      quitacao: {
        valor: fin?.pagamento?.quitacao?.valor ?? 0,
        forma: fin?.pagamento?.quitacao?.forma ?? null,
        status: fin?.pagamento?.quitacao?.status ?? null,
      },
    },
  }
}

function hydrateExecucao(exec?: Props["execucaoInit"]): ExecucaoVM {
  return {
    equipeId: exec?.equipeId ?? null,
    dataPrevInicio: parseMaybeDate(exec?.dataPrevInicio) ?? null,
    dataPrevConclusao: parseMaybeDate(exec?.dataPrevConclusao) ?? null,
  }
}

function showApiError(err: any) {
  const title = err?.title || err?.error || "Falha ao salvar"
  const code = err?.code || "UNKNOWN"
  const desc = err?.description || err?.message
  toast.error(`${title} (${code})`)
  console.error("[ObrasPage] API error", { title, code, description: desc, raw: err })
}

function isFile(v: any): v is File {
  return typeof File !== "undefined" && v instanceof File
}

function getImgFile(img: any): File | null {
  const f = img?.file
  return isFile(f) ? f : null
}

function normalizeImgsAfterUpload(current: ImgItem[], uploadedUrls: string[]): ImgItem[] {
  let j = 0
  return (current ?? []).map((img, i) => {
    const f = getImgFile(img as any)
    if (!f) return img
    const nextUrl = uploadedUrls[j] ?? ""
    j += 1

    const base: any = { ...(img as any) }
    base.url = nextUrl || String(base.url ?? "")
    if ("file" in base) delete base.file
    if ("previewUrl" in base) delete base.previewUrl
    if ("localUrl" in base) delete base.localUrl
    if ("isNew" in base) delete base.isNew
    if ("loading" in base) delete base.loading
    if ("error" in base) delete base.error

    if (!base.ordem || !Number.isFinite(Number(base.ordem))) base.ordem = i + 1
    return base as ImgItem
  })
}

function resolveClienteIdFromInitial(initial: any): number | undefined {
  const candidates = [
    initial?.cliente?.id,
    initial?.cliente_id,
    initial?.clienteId,
    initial?.orcamento?.cliente?.id,
    initial?.orcamento?.cliente_id,
    initial?.orcamento?.clienteId,
  ]

  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

function dtoToPedidoVM(p: PedidoCompraDTO): PedidoCompraVM {
  const categoria = normCategoria(p.categoria) as any
  const status = String(p.status ?? "PENDENTE").toUpperCase() as any

  return {
    id: p.id,
    descricao: String(p?.descricao ?? "").trim() || String(p?.observacoes ?? "").trim() || "",
    categoria,
    status,
    fornecedorNome: p.fornecedor?.nome ?? null,
    fornecedorId: p.fornecedor?.id ?? null,
    valorOrcado: Number(p.valores?.orcado ?? 0),
    valorRealizado: p.valores?.realizado ?? null,
    frete: p.valores?.frete ?? null,
    dataEntrega: p.entrega?.data ?? null,
    itens: (p.itens ?? []).map((i) => ({
      id: i.id,
      descricao: String(i.descricao ?? "").trim(),
      quantidade: Number(i.quantidade ?? 0),
      tamanho: i.tamanho ?? null,
      precoUnitario: Number(i.precoUnitario ?? 0),
      total: Number(i.total ?? 0),
    })),
  }
}

function isMeaningfulPedidoVM(p: Partial<PedidoCompraVM> | null | undefined) {
  if (!p) return false
  const id = Number((p as any)?.id ?? 0)
  if (Number.isFinite(id) && id > 0) return true

  const desc = String((p as any)?.descricao ?? "").trim()
  const fornecedorId = Number((p as any)?.fornecedorId ?? 0)
  const dataEntrega = String((p as any)?.dataEntrega ?? "").trim()
  const valorOrcado = toNum((p as any)?.valorOrcado ?? 0)
  const valorRealizado = (p as any)?.valorRealizado
  const frete = (p as any)?.frete
  const itens = Array.isArray((p as any)?.itens) ? (p as any).itens : []

  const hasMoney =
    (Number.isFinite(valorOrcado) && valorOrcado > 0) ||
    (valorRealizado != null && String(valorRealizado) !== "" && Number(valorRealizado) !== 0) ||
    (frete != null && String(frete) !== "" && Number(frete) !== 0)

  const hasFornecedor = Number.isFinite(fornecedorId) && fornecedorId > 0
  const hasEntrega = !!dataEntrega
  const hasDesc = !!desc
  const hasItens = itens.length > 0

  return hasMoney || hasFornecedor || hasEntrega || hasDesc || hasItens
}

function pickTelhaFromInit(pedidoInit: any, telhaEscolhida: string): any | null {
  const chosen = String(telhaEscolhida ?? "").trim()
  if (!chosen) return null
  const src = pedidoInit ?? {}
  const list = Array.isArray(src?.telhas) ? src.telhas : []
  if (list.length === 0) return null

  const byItemDesc = list.find((t: any) => {
    const item0 = Array.isArray(t?.itens) ? t.itens[0] : null
    const desc = String(item0?.descricao ?? "").trim()
    return desc.toLowerCase() === chosen.toLowerCase()
  })
  if (byItemDesc) return byItemDesc

  const byDescricao = list.find((t: any) => {
    const d = String(t?.descricao ?? "").toLowerCase()
    return d.includes(`telha: ${chosen.toLowerCase()}`)
  })
  return byDescricao ?? null
}

function buildDefaultAndaimesPedidoVM(): PedidoCompraVM {
  const preco = 8
  const itens = [
    { id: 1, descricao: "Andaime", quantidade: 12, tamanho: null, precoUnitario: preco, total: 12 * preco },
    { id: 2, descricao: "Plataforma", quantidade: 3, tamanho: null, precoUnitario: preco, total: 3 * preco },
  ]
  const valorOrcado = itens.reduce((acc, it) => acc + toNum(it.total), 0)

  return {
    id: undefined,
    descricao: "Andaimes (pré-pedido padrão)",
    categoria: "ANDAIMES" as any,
    status: "PENDENTE" as any,
    fornecedorNome: null,
    fornecedorId: null,
    valorOrcado: Number(valorOrcado.toFixed(2)),
    valorRealizado: null,
    frete: null,
    dataEntrega: null,
    itens: itens.map((x) => ({ ...x, total: Number(toNum(x.total).toFixed(2)) })),
  }
}

function ensureDefaultAndaimes(list: PedidoCompraVM[]): PedidoCompraVM[] {
  const arr = Array.isArray(list) ? [...list] : []
  const hasAndaimes = arr.some((p) => normCategoria((p as any)?.categoria) === "ANDAIMES")
  if (hasAndaimes) return arr
  arr.push(buildDefaultAndaimesPedidoVM())
  return arr
}

function pedidoInitToPedidosVM(pedidoInit: any, telhaEscolhida?: string): PedidoCompraVM[] {
  const src = pedidoInit ?? {}
  const out: PedidoCompraVM[] = []

  const pushIf = (cat: "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES", raw: any) => {
    if (!raw) return

    const p: PedidoCompraVM = {
      id: Number(raw?.id ?? 0) || undefined,
      descricao: String(raw?.descricao ?? raw?.observacoes ?? "").trim(),
      categoria: cat as any,
      status: (raw?.status ?? "PENDENTE") as any,
      fornecedorNome: raw?.fornecedorNome ?? null,
      fornecedorId: raw?.fornecedorId ?? null,
      valorOrcado: toNum(raw?.orcamento ?? raw?.valorOrcado ?? raw?.valor_orcado ?? raw?.valores?.orcado ?? 0),
      valorRealizado: raw?.valorRealizado ?? raw?.valor_realizado ?? raw?.valores?.realizado ?? null,
      frete: raw?.frete ?? raw?.valores?.frete ?? null,
      dataEntrega: raw?.previsao ?? raw?.dataEntrega ?? raw?.data_entrega ?? raw?.entrega?.data ?? null,
      itens: Array.isArray(raw?.itens)
        ? raw.itens.map((it: any, idx: number) => ({
            id: Number(it?.id ?? idx),
            descricao: String(it?.descricao ?? it?.madeiraNome ?? "").trim(),
            quantidade: toNum(it?.quantidade ?? 0),
            tamanho: it?.tamanho ?? null,
            precoUnitario: toNum(it?.precoUnitario ?? it?.preco_unitario ?? 0),
            total: toNum(it?.total ?? 0),
          }))
        : [],
    }

    if (isMeaningfulPedidoVM(p)) out.push(p)
  }

  const telhaRaw = telhaEscolhida ? pickTelhaFromInit(src, telhaEscolhida) : null
  if (telhaRaw) pushIf("TELHA", telhaRaw)

  pushIf("MADEIRA", src?.madeira)
  pushIf("ANDAIMES", src?.andaimes)

  return out
}

export default function ObrasPage({
  mode,
  obraId,
  orcamentoId,
  ordemServicoId,
  initial,
  tiposObraOptions,
  telhaOptions,
  pedidoInit,
  pedidosCompraInit,
  financeiroInit,
  execucaoInit,
  equipeOptions = [],
  anexosInit,
  cidades = [],
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(mode === "new")
  const [saving, setSaving] = useState(false)
  const [gerandoContrato, setGerandoContrato] = useState(false)

  const [vm, setVm] = useState<VM>(() => hydrateInfos(initial))

  const [pedidos, setPedidos] = useState<PedidoCompraVM[]>(() => {
    const fromDto = Array.isArray(pedidosCompraInit) ? pedidosCompraInit.map(dtoToPedidoVM) : []
    if (fromDto.length > 0) return fromDto
    const base = pedidoInitToPedidosVM(pedidoInit, initial?.telhaEscolhida ?? "")
    return ensureDefaultAndaimes(base)
  })

  const [fin, setFin] = useState<FinanceiroVM>(() => hydrateFinanceiro(financeiroInit))
  const [exec, setExec] = useState<ExecucaoVM>(() => hydrateExecucao(execucaoInit))

  const [clienteModalOpen, setClienteModalOpen] = useState(false)

  const [clienteId, setClienteId] = useState<number | undefined>(() => {
    const anyInitial = initial as any
    return resolveClienteIdFromInitial(anyInitial)
  })

  useEffect(() => {
    const anyInitial = initial as any
    const next = resolveClienteIdFromInitial(anyInitial)
    setClienteId(next)
  }, [initial])

  useEffect(() => {
    if (mode !== "view") return
    const fromDto = Array.isArray(pedidosCompraInit) ? pedidosCompraInit.map(dtoToPedidoVM) : []
    setPedidos(fromDto)
  }, [pedidosCompraInit, mode])

  useEffect(() => {
    if (mode !== "new") return
    const chosen = String(vm?.telhaEscolhida ?? "").trim()
    if (!chosen) return

    setPedidos((prev) => {
      const keep = Array.isArray(prev) ? prev.filter((p) => normCategoria((p as any)?.categoria) !== "TELHA") : []
      const telhaRaw = pickTelhaFromInit(pedidoInit, chosen)
      if (!telhaRaw) return ensureDefaultAndaimes(keep)
      const nextTelha = pedidoInitToPedidosVM({ telhas: [telhaRaw] }, chosen).find(
        (p) => normCategoria((p as any)?.categoria) === "TELHA"
      )
      if (!nextTelha) return ensureDefaultAndaimes(keep)
      return ensureDefaultAndaimes([...keep, nextTelha])
    })
  }, [vm?.telhaEscolhida, mode, pedidoInit])

  const clientePrefill = useMemo(
    () => ({
      nome: vm?.cliente?.nome ?? "",
      telefone: vm?.cliente?.telefone ?? "",
      cidade: vm?.cliente?.cidade ?? "",
      bairro: vm?.cliente?.bairro ?? "",
      cpf: (vm?.cliente?.cpf ?? null) as string | null,
    }),
    [vm?.cliente?.nome, vm?.cliente?.telefone, vm?.cliente?.cidade, vm?.cliente?.bairro, vm?.cliente?.cpf]
  )

  useEffect(() => {
    if (typeof document === "undefined") return
    const el = document.getElementById("infos.cliente.cpf") as HTMLInputElement | null
    if (!el) return
    const hasCpf = !!(vm?.cliente?.cpf && String(vm.cliente.cpf).trim() !== "")
    el.disabled = hasCpf
  }, [vm?.cliente?.cpf])

  const patchInfos = (p: Partial<VM>) => setVm((d) => ({ ...d, ...p }))
  const patchFinanceiro = (p: Partial<FinanceiroVM>) => setFin((d) => ({ ...d, ...p }))
  const patchExecucao = (p: Partial<ExecucaoVM>) => setExec((d) => ({ ...d, ...p }))

  const onEditCliente = () => {
    if (!clienteId) {
      toast.error("Não foi possível identificar o ID do cliente (orçamento/obra).")
      return
    }
    setClienteModalOpen(true)
  }

  const onClienteSaved = (c: {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
    cidade_nome: string | null
    cpf?: string | null
  }) => {
    setClienteId(c.id)

    patchInfos({
      cliente: {
        nome: c.nome ?? "",
        telefone: c.telefone ?? "",
        cpf: c.cpf ?? "",
        bairro: c.bairro ?? "",
        cidade: c.cidade_nome ?? "",
      },
    })
    setClienteModalOpen(false)
  }

  const tituloTopo = useMemo(() => {
    const base = vm?.cliente?.nome?.trim() ? vm.cliente.nome.split(" ")[0] : vm.titulo || "Obra"
    const cidadeTxt = vm?.endereco?.cidade ? ` [${vm.endereco.cidade}]` : ""
    return `${base}${cidadeTxt}`
  }, [vm])

  async function onCopyClienteData() {
    const nome = String(vm?.cliente?.nome ?? "").trim()
    const telefone = String(vm?.cliente?.telefone ?? "").trim()
    const endereco = String(vm?.endereco?.logradouro ?? "").trim()
    const maps = String(vm?.endereco?.mapsUrl ?? "").trim()

    if (!nome || !telefone || !endereco || !maps) {
      toast.error("Dados do cliente incompletos para copiar.")
      return
    }

    const text = `${nome} ${telefone}\n${endereco}\n${maps}`

    try {
      await navigator.clipboard.writeText(text)
      toast.success("Dados do cliente copiados.")
    } catch {
      toast.error("Não foi possível copiar os dados do cliente.")
    }
  }

  async function onAcessarOrcamentoOrigem() {
    if (!orcamentoId || Number(orcamentoId) <= 0) {
      toast.error("Orçamento de origem não encontrado nesta obra.")
      return
    }
    router.push(`/orcamento/detalhes/${orcamentoId}`)
  }

  async function onGerarContrato() {
    if (!obraId || Number(obraId) <= 0) {
      toast.error("ID da obra inválido.")
      return
    }

    if (!orcamentoId || Number(orcamentoId) <= 0) {
      toast.error("Orçamento de origem não encontrado nesta obra.")
      return
    }

    const payload = {
      orcamentoId: Number(orcamentoId),
      cliente: {
        nome: String(vm?.cliente?.nome ?? "").trim(),
        telefone: String(vm?.cliente?.telefone ?? "").trim(),
        cpf: String(vm?.cliente?.cpf ?? "").trim(),
        bairro: String(vm?.cliente?.bairro ?? "").trim(),
        cidade: String(vm?.cliente?.cidade ?? "").trim(),
      },
      endereco: {
        logradouro: String(vm?.endereco?.logradouro ?? "").trim(),
        bairro: String(vm?.endereco?.bairro ?? "").trim(),
        cidade: String(vm?.endereco?.cidade ?? "").trim(),
        mapsUrl: String(vm?.endereco?.mapsUrl ?? "").trim(),
      },
      pagamento: {
        entrada: {
          valor: Number(fin?.pagamento?.entrada?.valor ?? 0),
          forma: (fin?.pagamento?.entrada?.forma ?? null) as any,
          status: (fin?.pagamento?.entrada?.status ?? null) as any,
        },
        quitacao: {
          valor: Number(fin?.pagamento?.quitacao?.valor ?? 0),
          forma: (fin?.pagamento?.quitacao?.forma ?? null) as any,
          status: (fin?.pagamento?.quitacao?.status ?? null) as any,
        },
      },
      telhaEscolhida: String(vm?.telhaEscolhida ?? "").trim(),
    }

    if (
      !payload.cliente.nome ||
      !payload.cliente.telefone ||
      !payload.cliente.cpf ||
      !payload.cliente.bairro ||
      !payload.cliente.cidade ||
      !payload.endereco.logradouro ||
      !payload.endereco.bairro ||
      !payload.endereco.cidade ||
      !payload.endereco.mapsUrl ||
      !payload.telhaEscolhida
    ) {
      toast.error("Dados insuficientes para gerar o contrato (cliente/endereço/telha).")
      return
    }

    setGerandoContrato(true)
    toast.message("Gerando contrato…")

    try {
      const url = await gerarContratoN8nESalvar({
        obraId: Number(obraId),
        input: payload,
      })

      toast.success("Contrato gerado com sucesso.")
      if (url) window.open(url, "_blank", "noopener,noreferrer")
      router.refresh()
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : "Falha ao gerar contrato."
      toast.error(msg)
      console.error("[ObrasPage] gerar contrato error", err)
    } finally {
      setGerandoContrato(false)
    }
  }

  async function onGerarOrdemServico() {
    toast.message("Gerar ordem de serviço (ação pendente).")
  }

  function validateAndFocus(): boolean {
    if (isEmpty(vm.tipoObra)) {
      toast.error("Tipo de obra é obrigatório.")
      focusById("infos.tipoObra")
      return false
    }
    if (!(Number(vm.largura) > 0)) {
      toast.error("Largura é obrigatória.")
      focusById("infos.largura")
      return false
    }
    if (!(Number(vm.comprimento) > 0)) {
      toast.error("Comprimento é obrigatória.")
      focusById("infos.comprimento")
      return false
    }
    if (isEmpty(vm.telhaEscolhida)) {
      toast.error("Selecione a telha.")
      focusById("infos.telhaEscolhida")
      return false
    }
    if (isEmpty(vm.status)) {
      toast.error("Status é obrigatório.")
      focusById("infos.status")
      return false
    }

    if (isEmpty(vm?.endereco?.logradouro)) {
      toast.error("Logradouro é obrigatório.")
      focusById("infos.logradouro")
      return false
    }
    if (isEmpty(vm?.endereco?.mapsUrl)) {
      toast.error("Maps é obrigatório (cole a URL do Google Maps).")
      focusById("infos.maps")
      return false
    }

    if (isEmpty(vm?.cliente?.nome)) {
      toast.error("Nome do cliente é obrigatório (vem do orçamento).")
      return false
    }
    if (isEmpty(vm?.cliente?.telefone)) {
      toast.error("Telefone do cliente é obrigatório (vem do orçamento).")
      return false
    }
    if (isEmpty(vm?.cliente?.cpf)) {
      toast.error("CPF do cliente é obrigatório.")
      focusById("infos.cliente.cpf")
      return false
    }

    if (!(Number(fin?.valorObra) > 0)) {
      toast.error("Valor da obra é obrigatório.")
      focusById("fin.valorObra")
      return false
    }
    if (!(Number(fin?.maoDeObra) > 0)) {
      toast.error("Mão de obra é obrigatória.")
      focusById("fin.maoDeObra")
      return false
    }

    const ent = fin?.pagamento?.entrada ?? {}
    if (!(Number(ent?.valor) > 0)) {
      toast.error("Valor de entrada é obrigatório.")
      focusById("fin.entrada.valor")
      return false
    }
    if (isEmpty(ent?.forma)) {
      toast.error("Forma da entrada é obrigatória.")
      focusById("fin.entrada.forma")
      return false
    }
    if (isEmpty(ent?.status)) {
      toast.error("Status da entrada é obrigatório.")
      focusById("fin.entrada.status")
      return false
    }

    const qui = fin?.pagamento?.quitacao ?? {}
    if (!(Number(qui?.valor) > 0)) {
      toast.error("Valor da quitação é obrigatória.")
      focusById("fin.quitacao.valor")
      return false
    }
    if (isEmpty(qui?.forma)) {
      toast.error("Forma da quitação é obrigatória.")
      focusById("fin.quitacao.forma")
      return false
    }
    if (isEmpty(qui?.status)) {
      toast.error("Status da quitação é obrigatória.")
      focusById("fin.quitacao.status")
      return false
    }

    if (vm.status !== "Finalizado") {
      if (!exec?.equipeId || Number(exec?.equipeId) <= 0) {
        toast.error("Equipe é obrigatória.")
        focusById("exec.equipeId")
        return false
      }
      if (!exec?.dataPrevInicio) {
        toast.error("Data prevista de início é obrigatória.")
        focusById("exec.dataPrevInicio")
        return false
      }
      if (!exec?.dataPrevConclusao) {
        toast.error("Data prevista de conclusão é obrigatória.")
        focusById("exec.dataPrevConclusao")
        return false
      }
    }

    return true
  }

  async function uploadImagensIfNeeded(): Promise<ImgItem[]> {
    const imgs = (vm.imagens ?? []).filter((img) => img != null)
    const filesToUpload = imgs.map((it) => getImgFile(it as any)).filter((f): f is File => !!f)

    if (filesToUpload.length === 0) {
      return imgs
        .filter((img) => String((img as any)?.url ?? "").trim() !== "")
        .map((img, i) => ({ ...(img as any), ordem: Number((img as any)?.ordem ?? i + 1) })) as ImgItem[]
    }

    toast.message(`Enviando ${filesToUpload.length} imagem(ns)…`)
    const up = await uploadImagensObra(filesToUpload)
    const normalized = normalizeImgsAfterUpload(imgs, up.urls)

    setVm((d) => ({ ...(d as any), imagens: normalized as any }))
    return normalized
  }

  const mapPedidoVMItensToCreate = (categoria: any, arr: any[] = []) =>
    arr.map((it) => {
      const quantidade = Number(it?.quantidade ?? 0)
      const precoUnitario = Number(it?.precoUnitario ?? 0)
      const total =
        it?.total !== undefined && it?.total !== null && String(it.total) !== ""
          ? Number(it.total)
          : precoUnitario * quantidade

      const base: any = {
        descricao: String(it?.descricao ?? "").trim(),
        quantidade,
        preco_unitario: precoUnitario,
        total,
      }

      const cat = normCategoria(String(categoria ?? ""))
      const tamanhoRaw = it?.tamanho
      if (cat === "MADEIRA" && tamanhoRaw !== undefined && tamanhoRaw !== null && String(tamanhoRaw) !== "") {
        const t = Number(tamanhoRaw)
        base.tamanho = Number.isFinite(t) ? t : undefined
      }

      return base
    })

  const buildPedidosCompraPayload = (list: PedidoCompraVM[]) => {
    const safe = Array.isArray(list) ? list : []
    return safe
      .filter((p) => isMeaningfulPedidoVM(p))
      .map((p) => ({
        categoria: normCategoria((p as any)?.categoria ?? "MATERIAIS"),
        status: (p as any)?.status ?? null,
        valor_orcado: Number((p as any)?.valorOrcado ?? 0),
        valor_realizado: (p as any)?.valorRealizado ?? null,
        frete: (p as any)?.frete ?? null,
        descricao: String((p as any)?.descricao ?? "").trim() || null,
        observacoes: null,
        fornecedor_id: (p as any)?.fornecedorId != null ? Number((p as any).fornecedorId) : null,
        data_entrega: (p as any)?.dataEntrega ?? null,
        endereco_entrega: null,
        nome_receptor: null,
        telefone_receptor: null,
        link_maps: null,
        itens: mapPedidoVMItensToCreate((p as any)?.categoria, (p as any)?.itens ?? []),
      }))
  }

  async function onSave() {
    try {
      setSaving(true)
      if (!validateAndFocus()) return

      const imagensFinal = await uploadImagensIfNeeded()

      if (mode === "new") {
        if (!orcamentoId) {
          toast.error("Orçamento não informado.")
          return
        }

        const payload: CreateObraPayload = {
          orcamentoId: Number(orcamentoId),

          endereco_obra: vm.endereco.logradouro.trim(),
          maps_url: vm.endereco.mapsUrl.trim(),
          tipo_obra: String(vm.tipoObra || "").trim(),
          largura: Number(vm.largura),
          comprimento: Number(vm.comprimento),
          telha_escolhida: vm.telhaEscolhida.trim(),

          valor_obra: Number(fin.valorObra),
          valor_mao_de_obra: Number(fin.maoDeObra),

          pagamento_entrada: Number(fin.pagamento?.entrada?.valor ?? 0),
          forma_pagamento_entrada: fin.pagamento?.entrada?.forma ?? null,
          status_pagamento_entrada: fin.pagamento?.entrada?.status ?? null,

          pagamento_quitacao: Number(fin.pagamento?.quitacao?.valor ?? 0),
          forma_pagamento_quitacao: fin.pagamento?.quitacao?.forma ?? null,
          status_pagamento_quitacao: fin.pagamento?.quitacao?.status ?? null,

          observacoes: vm.observacoes ?? null,
          status: vm.status as any,

          equipe_id: exec.equipeId ?? null,
          data_prev_inicio: (exec.dataPrevInicio as any) ?? null,
          data_prev_conclusao: (exec.dataPrevConclusao as any) ?? null,

          imagens: (imagensFinal ?? [])
            .filter((img) => String((img as any)?.url ?? "").trim() !== "")
            .map((img: any, i: number) => ({
              url: String(img.url ?? "").trim(),
              ordem: Number.isFinite(Number(img.ordem)) ? Number(img.ordem) : i,
              legenda: img.legenda || null,
            })),

          pedidosCompra: buildPedidosCompraPayload(ensureDefaultAndaimes(pedidos ?? [])),

          clienteCpf: vm.cliente?.cpf?.trim() || null,
        }

        const r = await createObra(payload)
        toast.success("Obra criada.")
        router.push(`/obras/${r.obraId}`)
        return
      }

      if (obraId) {
        const ordemServico: OrdemServicoPayload = {
          equipe_id: exec.equipeId ?? undefined,
          data_prev_inicio: (exec.dataPrevInicio as any) ?? undefined,
          data_prev_conclusao: (exec.dataPrevConclusao as any) ?? undefined,
        }

        const imagensReplace: UpdateObraPayload["imagens"] = {
          replace: true,
          list: (imagensFinal ?? [])
            .filter((img: any) => String(img?.url ?? "").trim() !== "")
            .map((img: any, i: number) => ({
              id: img.id ?? undefined,
              url: String(img.url ?? "").trim(),
              ordem: Number.isFinite(Number(img.ordem)) ? Number(img.ordem) : i,
              legenda: img?.legenda && String(img.legenda).trim() !== "" ? String(img.legenda).trim() : undefined,
            })),
        }

        const upd: UpdateObraPayload = {
          obra: {
            endereco_obra: vm.endereco.logradouro,
            maps_url: vm.endereco.mapsUrl,
            tipo_obra: vm.tipoObra || "",
            largura: vm.largura ?? 0,
            comprimento: vm.comprimento ?? 0,
            telha_escolhida: vm.telhaEscolhida || "",
            status: vm.status as any,
            observacoes: vm.observacoes ?? undefined,
          },

          financeiro: {
            valor_obra: Number(fin.valorObra ?? 0),
            valor_mao_de_obra: Number(fin.maoDeObra ?? 0),
            pagamento_entrada: Number(fin.pagamento?.entrada?.valor ?? 0),
            forma_pagamento_entrada: fin.pagamento?.entrada?.forma ?? undefined,
            status_pagamento_entrada: fin.pagamento?.entrada?.status ?? undefined,
            pagamento_quitacao: Number(fin.pagamento?.quitacao?.valor ?? 0),
            forma_pagamento_quitacao: fin.pagamento?.quitacao?.forma ?? undefined,
            status_pagamento_quitacao: fin.pagamento?.quitacao?.status ?? undefined,
          },

          ordemServico,
          imagens: imagensReplace,
        }

        await updateObra(obraId, upd)
        toast.success("Obra atualizada.")
        setIsEditing(false)
      }
    } catch (e: any) {
      showApiError(e)
    } finally {
      setSaving(false)
    }
  }

  function onCancel() {
    setVm(hydrateInfos(initial))

    if (mode === "view") {
      const fromDto = Array.isArray(pedidosCompraInit) ? pedidosCompraInit.map(dtoToPedidoVM) : []
      setPedidos(fromDto)
    } else {
      const base = pedidoInitToPedidosVM(pedidoInit, (initial as any)?.telhaEscolhida ?? "")
      setPedidos(ensureDefaultAndaimes(base))
    }

    setFin(hydrateFinanceiro(financeiroInit))
    setExec(hydrateExecucao(execucaoInit))
    setIsEditing(false)
  }

  const orcamentoLinkFinal = useMemo(() => {
    if (anexosInit?.orcamento) return anexosInit.orcamento
    if (typeof window !== "undefined" && orcamentoId) {
      return `${window.location.origin}/orcamento/detalhes/${orcamentoId}`
    }
    return ""
  }, [anexosInit?.orcamento, orcamentoId])

  const propostaLinkFinal = anexosInit?.proposta ?? ""
  const contratoLinkFinal = anexosInit?.contrato ?? ""

  const contratoMenuLabel = useMemo(() => {
    return contratoLinkFinal && String(contratoLinkFinal).trim() !== "" ? "Reenviar contrato" : "Gerar contrato"
  }, [contratoLinkFinal])

  const onCreatePedido = (draft: Partial<PedidoCompraVM>) => {
    setPedidos((prev) => {
      const list = Array.isArray(prev) ? [...prev] : []
      const next: PedidoCompraVM = {
        id: (draft as any)?.id ?? undefined,
        descricao: String((draft as any)?.descricao ?? "").trim(),
        categoria: (draft as any)?.categoria ?? ("MATERIAIS" as any),
        status: (draft as any)?.status ?? ("PENDENTE" as any),
        fornecedorNome: (draft as any)?.fornecedorNome ?? null,
        fornecedorId: (draft as any)?.fornecedorId ?? null,
        valorOrcado: Number((draft as any)?.valorOrcado ?? 0),
        valorRealizado: (draft as any)?.valorRealizado ?? null,
        frete: (draft as any)?.frete ?? null,
        dataEntrega: (draft as any)?.dataEntrega ?? null,
        itens: (draft as any)?.itens ?? [],
      }

      if (!isMeaningfulPedidoVM(next)) return list
      list.push(next)
      return ensureDefaultAndaimes(list)
    })
  }

  return (
    <PageLayout
      links={[
        { label: "Home", href: "/" },
        { label: "Obras", href: "/obras" },
      ]}
      title={tituloTopo}
      headerActions={
        <div className="flex gap-2">
          {!isEditing ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="h-8 w-10 px-0" disabled={gerandoContrato}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[240px]">
                <DropdownMenuItem onClick={onCopyClienteData}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar dados do cliente
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onAcessarOrcamentoOrigem}>
                  <FileText className="h-4 w-4 mr-2" />
                  Acessar orçamento de origem
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={onGerarContrato} disabled={gerandoContrato}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  {gerandoContrato ? "Gerando contrato…" : contratoMenuLabel}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onGerarOrdemServico}>
                  <ScrollText className="h-4 w-4 mr-2" />
                  Gerar ordem de serviço
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button size="sm" variant="secondary" className="h-8 min-w-[110px]" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-8 min-w-[110px] bg-green text-white hover:bg-green/80"
                onClick={onSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </>
          )}
        </div>
      }
    >
      <ClienteModal
        open={clienteModalOpen}
        mode="edit"
        clienteId={clienteId}
        prefill={clientePrefill}
        cidades={cidades}
        onClose={() => setClienteModalOpen(false)}
        onSaved={onClienteSaved}
      />

      <InfosGerais
        value={vm}
        onChange={patchInfos}
        isEditing={isEditing}
        tiposObraOptions={tiposObraOptions}
        telhaOptions={telhaOptions}
        onEditCliente={onEditCliente}
      />

      <div className="mt-6">
        <ObsImagens observacoes={vm.observacoes} imagens={vm.imagens ?? []} isEditing={isEditing} onChange={patchInfos} />
      </div>

      <div className="mt-6">
        <PedidoCompraCardSection
          mode={mode === "new" ? "create" : isEditing ? "edit" : "view"}
          pedidos={pedidos ?? []}
          obraId={obraId ?? null}
          onCreate={onCreatePedido}
          onCancelar={(id) => toast.message(`Cancelar pedido ${id} (ação pendente de endpoint)`)}
          onIntegrar={(id) => toast.message(`Integrar pedido ${id} (ação pendente de endpoint)`)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Financeiro className="lg:col-span-2" value={fin} onChange={patchFinanceiro} isEditing={isEditing} />
        <Execucao
          className="lg:col-span-1"
          value={exec}
          onChange={patchExecucao}
          isEditing={isEditing}
          equipeOptions={equipeOptions}
        />
      </div>

      <div className="mt-6">
        <Anexos
          mode={mode}
          orcamentoLink={orcamentoLinkFinal}
          orcamentoId={orcamentoId ?? null}
          propostaLink={propostaLinkFinal}
          contratoLink={contratoLinkFinal}
          ordemServicoId={ordemServicoId ?? null}
        />
      </div>
    </PageLayout>
  )
}
