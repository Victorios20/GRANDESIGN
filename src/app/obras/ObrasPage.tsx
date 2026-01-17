// src/app/obras/ObrasPage.tsx
"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Pencil, X, Copy, MoreHorizontal } from "lucide-react"

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
import PedidoCompra from "./_sections/PedidoCompra"
import Financeiro, { type FinanceiroVM } from "./_sections/Financeiro"
import Execucao, { type ExecucaoVM } from "./_sections/Execucao"

import type {
  ObraInfosVM,
  CreateObraPayload,
  UpdateObraPayload,
  PedidoCompraVM,
  OrdemServicoPayload,
} from "./lib/types"
import { createObra, updateObra } from "./lib/api"

import ClienteModal from "@/components/modals/ClienteModal"
import { uploadImagensObra } from "./lib/upload-imagens"

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

/* ================= NOVO DTO (detalhado) =================
   Se você já tiver esse type no ./lib/types, remova daqui e importe de lá.
*/
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
}

type Props = {
  mode: "new" | "view"
  obraId?: number
  orcamentoId?: number
  ordemServicoId?: number | null
  initial: Partial<ObraInfosVM> & { imagens?: ImgItem[] }
  tiposObraOptions: Option[]
  telhaOptions: Option[]
  pedidoInit?: Partial<PedidoCompraVM>

  // NOVO: vem do page.tsx (detalhado)
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

/* ================= helpers ================= */
const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const nomeTelha = (it: any): string => ((it?.descricao ?? it?.nome ?? "") + "").trim()

const totalItemTelha = (it: any): number => {
  const qtd = toNum(it?.quantidade)
  const precoUnitario = toNum(it?.precoUnitario)
  if (it?.total != null && it.total !== "") return toNum(it.total)
  return precoUnitario * qtd
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

function hydratePedidoFromDTOs(pedidos?: PedidoCompraDTO[]): PedidoCompraVM {
  const list = Array.isArray(pedidos) ? pedidos : []

  const byCat = (cat: string) => list.find((p) => normCategoria(p.categoria) === cat) ?? null

  const telha = byCat("TELHA")
  const madeira = byCat("MADEIRA")
  const materiais = byCat("MATERIAIS")
  const andaimes = byCat("ANDAIMES")

  return {
    telha: {
      status: (telha?.status as any) ?? "Pendente",
      previsao: telha?.entrega?.data ?? null,
      orcamento: Number(telha?.valores?.orcado ?? 0),
      area: 0,
      fornecedorId: telha?.fornecedor?.id ?? null,
      itens: (telha?.itens ?? []).map((i) => ({
        id: i.id,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        total: i.total,
      })),
    },

    madeira: {
      status: (madeira?.status as any) ?? "Pendente",
      previsao: madeira?.entrega?.data ?? null,
      fornecedorId: madeira?.fornecedor?.id ?? null,
      orcamento: Number(madeira?.valores?.orcado ?? 0),
      itens: (madeira?.itens ?? []).map((i) => ({
        id: i.id,
        componente: "",
        madeiraNome: "",
        descricao: i.descricao,
        quantidade: i.quantidade,
        tamanho: Number(i.tamanho ?? 0),
        precoUnitario: i.precoUnitario,
        total: i.total,
      })),
    },

    materiais: {
      status: (materiais?.status as any) ?? "Pendente",
      itens: (materiais?.itens ?? []).map((i) => ({
        id: i.id,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        total: i.total,
      })),
    },

    andaimes: {
      status: (andaimes?.status as any) ?? "Pendente",
      fornecedorId: andaimes?.fornecedor?.id ?? null,
      itens: (andaimes?.itens ?? []).map((i) => ({
        id: i.id,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        total: i.total,
      })),
    },
  }
}


function hydratePedido(params: {
  pedidoInit?: Partial<PedidoCompraVM>
  pedidosCompraInit?: PedidoCompraDTO[]
}): PedidoCompraVM {
  if (params?.pedidosCompraInit && Array.isArray(params.pedidosCompraInit) && params.pedidosCompraInit.length > 0) {
    return hydratePedidoFromDTOs(params.pedidosCompraInit)
  }

  const initial = params?.pedidoInit

  return {
    telha: {
      status: initial?.telha?.status ?? "Pendente",
      previsao: initial?.telha?.previsao ?? null,
      orcamento: initial?.telha?.orcamento ?? 0,
      area: initial?.telha?.area ?? 0,
      fornecedorId: (initial as any)?.telha?.fornecedorId ?? null,
      itens: initial?.telha?.itens ?? [],
    },
    madeira: {
      status: initial?.madeira?.status ?? "Pendente",
      previsao: initial?.madeira?.previsao ?? null,
      fornecedorId: initial?.madeira?.fornecedorId ?? null,
      itens: initial?.madeira?.itens ?? [],
      orcamento: Number(initial?.madeira?.orcamento ?? 0),
    },
    materiais: {
      status: initial?.materiais?.status ?? "Pendente",
      itens: initial?.materiais?.itens ?? [],
    },
    andaimes: {
      status: initial?.andaimes?.status ?? "Pendente",
      fornecedorId: initial?.andaimes?.fornecedorId ?? null,
      itens: initial?.andaimes?.itens ?? [],
    },
  }
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

function isEmpty(v: any) {
  if (v === null || v === undefined) return true
  if (typeof v === "string") return v.trim() === ""
  return false
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
  catalogo,
  componentes,
  fornecedoresTelhaOptions,
  fornecedoresMadeiraOptions,
  fornecedoresAndaimesOptions,
  financeiroInit,
  execucaoInit,
  equipeOptions = [],
  anexosInit,
  cidades = [],
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(mode === "new")
  const [saving, setSaving] = useState(false)

  const [vm, setVm] = useState<VM>(() => hydrateInfos(initial))
  const [pedido, setPedido] = useState<PedidoCompraVM>(() =>
    hydratePedido({ pedidoInit, pedidosCompraInit })
  )
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

  const catalogoSafe: Catalogo = useMemo(
    () => ({
      madeiras: catalogo?.madeiras ?? [],
      materiaisGerais: catalogo?.materiaisGerais ?? [],
      telhas: catalogo?.telhas ?? [],
    }),
    [catalogo]
  )
  const componentesSafe: Componente[] = useMemo(() => componentes ?? [], [componentes])

  const patchInfos = (p: Partial<VM>) => setVm((d) => ({ ...d, ...p }))
  const patchPedido = (p: Partial<PedidoCompraVM>) => setPedido((d) => ({ ...d, ...p }))
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
    const cidade = vm?.endereco?.cidade ? ` [${vm.endereco.cidade}]` : ""
    return `${base}${cidade}`
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

  const telhaItensSelecionados = useMemo(() => {
    const alvo = (vm.telhaEscolhida ?? "").trim()
    if (!alvo) return []
    return (pedido.telha?.itens ?? []).filter((it: any) => nomeTelha(it) === alvo)
  }, [pedido.telha?.itens, vm.telhaEscolhida])

  const telhaUnidades = useMemo(
    () => telhaItensSelecionados.reduce((s, it) => s + toNum(it?.quantidade), 0),
    [telhaItensSelecionados]
  )

  const telhaOrcamentoDerivado = useMemo(
    () => telhaItensSelecionados.reduce((s, it) => s + totalItemTelha(it), 0),
    [telhaItensSelecionados]
  )

  useEffect(() => {
    const atualOrcamento = toNum(pedido.telha?.orcamento)
    const desejadoOrcamento = toNum(telhaOrcamentoDerivado)
    if (atualOrcamento !== desejadoOrcamento) {
      setPedido((d) => ({ ...d, telha: { ...(d.telha ?? {}), orcamento: desejadoOrcamento } }))
    }
  }, [telhaOrcamentoDerivado])

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
      toast.error("Comprimento é obrigatório.")
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

        const telhaItens = (pedido.telha?.itens ?? []).map((it) => ({
          descricao: String(it?.descricao ?? "").trim(),
          quantidade: Number(it?.quantidade ?? 0),
          preco_unitario: Number(it?.precoUnitario ?? 0),
          total: Number(totalItemTelha(it)),
        }))

        const madeiraItens = (pedido.madeira?.itens ?? []).map((it) => ({
          componente: String(it?.componente ?? "").trim(),
          madeira_nome: String(it?.madeiraNome ?? it?.descricao ?? "").trim(),
          descricao: String(it?.descricao ?? it?.madeiraNome ?? "").trim(),
          quantidade: Number(it?.quantidade ?? 0),
          tamanho: Number(it?.tamanho ?? 0),
          preco_unitario: Number(it?.precoUnitario ?? 0),
          total: Number(it?.total ?? Number(it?.precoUnitario ?? 0) * Number(it?.quantidade ?? 0)),
        }))

        const materiaisItens = (pedido.materiais?.itens ?? []).map((it) => ({
          descricao: String(it?.descricao ?? "").trim(),
          quantidade: Number(it?.quantidade ?? 0),
          preco_unitario: Number(it?.precoUnitario ?? 0),
          total: Number(it?.total ?? Number(it?.precoUnitario ?? 0) * Number(it?.quantidade ?? 0)),
        }))

        const andaimesItens = (pedido.andaimes?.itens ?? []).map((it) => ({
          descricao: String(it?.descricao ?? "").trim(),
          quantidade: Number(it?.quantidade ?? 0),
          preco_unitario: Number(it?.precoUnitario ?? 0),
          total: Number(it?.total ?? Number(it?.precoUnitario ?? 0) * Number(it?.quantidade ?? 0)),
        }))

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

          area_telha: Number(pedido.telha?.area ?? 0),
          orcamento_telha: Number(pedido.telha?.orcamento ?? 0),
          previsao_telha: (pedido.telha?.previsao as any) ?? null,
          status_telha: (pedido.telha?.status as any) ?? "Pendente",
          fornecedor_telha_id: pedido.telha?.fornecedorId ? Number(pedido.telha.fornecedorId) : null,

          orcamento_madeira: Number(pedido.madeira?.orcamento ?? 0),
          previsao_madeira: (pedido.madeira?.previsao as any) ?? null,
          status_madeira: (pedido.madeira?.status as any) ?? "Pendente",
          fornecedor_madeira_id: pedido.madeira?.fornecedorId ? Number(pedido.madeira.fornecedorId) : null,

          materiais_status: (pedido.materiais?.status as any) ?? "Pendente",

          andaimes_status: (pedido.andaimes?.status as any) ?? "Pendente",
          andaimes_fornecedor_id: pedido.andaimes?.fornecedorId ? Number(pedido.andaimes.fornecedorId) : null,

          telhaItens,
          madeiraItens,
          materiaisItens,
          andaimesItens,

          clienteCpf: vm.cliente?.cpf?.trim() || null,
        }

        const r = await createObra(payload)
        toast.success("Obra criada.")
        router.push(`/obras/${r.obraId}`)
      } else if (obraId) {
        const ordemServico: OrdemServicoPayload = {
          equipe_id: exec.equipeId ?? undefined,
          data_prev_inicio: (exec.dataPrevInicio as any) ?? undefined,
          data_prev_conclusao: (exec.dataPrevConclusao as any) ?? undefined,
        }

        const mapTelhaItens = (arr: any[] = []) =>
          arr.map((it) => ({
            id: it?.id ?? undefined,
            descricao: String(it?.descricao ?? "").trim(),
            quantidade: Number(it?.quantidade ?? 0),
            preco_unitario: Number(it?.precoUnitario ?? 0),
            total:
              it?.total !== undefined && it?.total !== null && String(it.total) !== ""
                ? Number(it.total)
                : Number(it?.precoUnitario ?? 0) * Number(it?.quantidade ?? 0),
          }))

        const mapMadeiraItens = (arr: any[] = []) =>
          arr.map((it) => ({
            id: it?.id ?? undefined,
            componente: String(it?.componente ?? "").trim() || undefined,
            madeira_nome: String(it?.madeiraNome ?? it?.descricao ?? "").trim() || undefined,
            descricao: String(it?.descricao ?? it?.madeiraNome ?? "").trim(),
            quantidade: Number(it?.quantidade ?? 0),
            tamanho: Number(it?.tamanho ?? 0),
            preco_unitario: Number(it?.precoUnitario ?? 0),
            total:
              it?.total !== undefined && it?.total !== null && String(it.total) !== ""
                ? Number(it.total)
                : Number(it?.precoUnitario ?? 0) * Number(it?.quantidade ?? 0),
          }))

        const mapMateriaisItens = (arr: any[] = []) =>
          arr.map((it) => ({
            id: it?.id ?? undefined,
            descricao: String(it?.descricao ?? "").trim(),
            quantidade: Number(it?.quantidade ?? 0),
            preco_unitario: Number(it?.precoUnitario ?? 0),
            total:
              it?.total !== undefined && it?.total !== null && String(it.total) !== ""
                ? Number(it.total)
                : Number(it?.precoUnitario ?? 0) * Number(it?.quantidade ?? 0),
          }))

        const pedidoCompra: UpdateObraPayload["pedidoCompra"] = {
          area_telha: Number(pedido.telha?.area ?? 0),
          orcamento_telha: Number(pedido.telha?.orcamento ?? 0),
          previsao_telha: (pedido.telha?.previsao as any) ?? undefined,
          status_telha: (pedido.telha?.status as any) ?? undefined,
          fornecedor_telha_id: pedido.telha?.fornecedorId != null ? Number(pedido.telha.fornecedorId) : undefined,

          orcamento_madeira: Number(pedido.madeira?.orcamento ?? 0),
          previsao_madeira: (pedido.madeira?.previsao as any) ?? undefined,
          status_madeira: (pedido.madeira?.status as any) ?? undefined,
          fornecedor_madeira_id: pedido.madeira?.fornecedorId != null ? Number(pedido.madeira.fornecedorId) : undefined,

          materiais_status: (pedido.materiais?.status as any) ?? undefined,

          andaimes_status: (pedido.andaimes?.status as any) ?? undefined,
          andaimes_fornecedor_id: pedido.andaimes?.fornecedorId != null ? Number(pedido.andaimes.fornecedorId) : undefined,

          itens: {
            telha: mapTelhaItens(pedido.telha?.itens),
            madeira: mapMadeiraItens(pedido.madeira?.itens),
            materiais: mapMateriaisItens(pedido.materiais?.itens),
            andaimes: mapMateriaisItens(pedido.andaimes?.itens),
          },
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

          pedidoCompra,

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
    setPedido(hydratePedido({ pedidoInit, pedidosCompraInit }))
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
                <Button size="sm" variant="secondary" className="h-8 w-10 px-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuItem onClick={onCopyClienteData}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar dados do cliente
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

      <PedidoCompra
        value={pedido}
        onChange={patchPedido}
        isEditing={isEditing}
        telhaSelecionada={vm.telhaEscolhida || null}
        telhaUnidades={telhaUnidades}
        catalogo={catalogoSafe}
        componentes={componentesSafe}
        fornecedoresMadeiraOptions={fornecedoresMadeiraOptions}
        fornecedoresAndaimesOptions={fornecedoresAndaimesOptions}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Financeiro className="lg:col-span-2" value={fin} onChange={patchFinanceiro} isEditing={isEditing} />
        <Execucao className="lg:col-span-1" value={exec} onChange={patchExecucao} isEditing={isEditing} equipeOptions={equipeOptions} />
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
