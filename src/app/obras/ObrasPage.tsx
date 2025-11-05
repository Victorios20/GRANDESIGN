"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Pencil, X } from "lucide-react"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"

import InfosGerais from "./_sections/InfosGerais"
import ObsImagens, { type ImgItem } from "./_sections/ObsImagens"
import PedidoCompra from "./_sections/PedidoCompra"

import type {
  ObraInfosVM,
  CreateObraPayload,
  UpdateObraPayload,
  PedidoCompraVM,
} from "./lib/types"
import { createObra, updateObra } from "./lib/api"

type Option = { value: string; label: string }
type VM = ObraInfosVM & { imagens?: ImgItem[] }

/** Tipos leves só para transporte do catálogo vindo do SSR */
type CatalogoItem = { nome: string; preco: number }
type Catalogo = {
  madeiras: CatalogoItem[]
  materiaisGerais: CatalogoItem[]
  telhas: CatalogoItem[]
}

/** Estrutura livre para os componentes (lista de componentes de madeira) */
type Componente = { id?: number; nome: string; categoria?: string } | any

type Props = {
  mode: "new" | "view"
  obraId?: number
  orcamentoId?: number
  initial: Partial<ObraInfosVM> & { imagens?: ImgItem[] }
  tiposObraOptions: Option[]
  telhaOptions: Option[]
  /** pré-preenchimento vindo do orçamento/obra (SSR) */
  pedidoInit?: Partial<PedidoCompraVM>
  /** NOVO: catálogos carregados no server e injetados no client para os combobox das 3 tabelas */
  catalogo?: Catalogo
  /** NOVO: lista de componentes (ex.: para associar em madeiras) */
  componentes?: Componente[]
}

/* ================= helpers ================= */
const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const nomeTelha = (it: any): string => ((it?.descricao ?? it?.nome ?? "") + "").trim()
const totalItemTelha = (it: any): number => {
  const qtd = toNum(it?.quantidade)
  const precoUnitario = toNum(it?.precoUnitario ?? it?.preco)
  const total = it?.total != null ? toNum(it.total) : precoUnitario * qtd + toNum(it?.frete)
  return total
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

function hydratePedido(initial?: Partial<PedidoCompraVM>): PedidoCompraVM {
  return {
    telha: {
      status: initial?.telha?.status ?? "Pendente",
      previsao: initial?.telha?.previsao ?? null,
      orcamento: initial?.telha?.orcamento ?? 0,
      area: initial?.telha?.area ?? 0,
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

export default function ObrasPage({
  mode,
  obraId,
  orcamentoId,
  initial,
  tiposObraOptions,
  telhaOptions,
  pedidoInit,
  /** NOVO: vindo do SSR */
  catalogo,
  componentes,
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(mode === "new")
  const [saving, setSaving] = useState(false)

  const [vm, setVm] = useState<VM>(() => hydrateInfos(initial))
  const [pedido, setPedido] = useState<PedidoCompraVM>(() => hydratePedido(pedidoInit))

  /** Fallbacks seguros para evitar undefined em renders iniciais */
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

  const tituloTopo = useMemo(() => {
    const base = vm?.cliente?.nome?.trim() ? vm.cliente.nome.split(" ")[0] : vm.titulo || "Obra"
    const cidade = vm?.endereco?.cidade ? ` [${vm.endereco.cidade}]` : ""
    return `${base}${cidade}`
  }, [vm])

  /* ======= derivar telha (filtrada pela telhaEscolhida) ======= */
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
      patchPedido({ telha: { ...pedido.telha, orcamento: desejadoOrcamento } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telhaOrcamentoDerivado])

  async function onSave() {
    try {
      setSaving(true)
      if (mode === "new") {
        if (!orcamentoId) {
          toast.error("Orçamento não informado.")
          return
        }
        const payload: CreateObraPayload = {
          orcamentoId: Number(orcamentoId),
          endereco_obra: vm.endereco.logradouro,
          maps_url: vm.endereco.mapsUrl,
          tipo_obra: vm.tipoObra || "",
          largura: vm.largura ?? 0,
          comprimento: vm.comprimento ?? 0,
          telha_escolhida: vm.telhaEscolhida || "",
          valor_obra: 0,
          valor_mao_de_obra: 0,
          observacoes: vm.observacoes ?? null,
          actorUserId: 0,
          clienteCpf: vm.cliente?.cpf ?? null,
        }
        const r = await createObra(payload)
        toast.success("Obra criada.")
        router.push(`/obras/${r.obraId}`)
      } else if (obraId) {
        const upd: UpdateObraPayload = {
          obra: {
            endereco_obra: vm.endereco.logradouro,
            maps_url: vm.endereco.mapsUrl,
            tipo_obra: vm.tipoObra || "",
            largura: vm.largura ?? 0,
            comprimento: vm.comprimento ?? 0,
            telha_escolhida: vm.telhaEscolhida || "",
            status: vm.status,
            observacoes: vm.observacoes ?? undefined,
          },
        }
        await updateObra(obraId, upd)
        toast.success("Obra atualizada.")
        setIsEditing(false)
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  function onCancel() {
    setVm(hydrateInfos(initial))
    setPedido(hydratePedido(pedidoInit))
    setIsEditing(false)
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
            <Button
              size="sm"
              className="h-8 min-w-[110px] bg-bege text-marromEscuro hover:bg-bege/80"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
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
      {/* Card 1 — Informações Gerais */}
      <InfosGerais
        value={vm}
        onChange={patchInfos}
        isEditing={isEditing}
        tiposObraOptions={tiposObraOptions}
        telhaOptions={telhaOptions}
      />

      {/* Card 2 — Observações & Imagens */}
      <div className="mt-6">
        <ObsImagens
          observacoes={vm.observacoes}
          imagens={vm.imagens ?? []}
          isEditing={isEditing}
          onChange={patchInfos}
        />
      </div>

      {/* Card 3 — Pedido de Compra (Telhas, Madeiras, Materiais, Andaimes) */}
      <PedidoCompra
        value={pedido}
        onChange={patchPedido}
        isEditing={isEditing}
        telhaSelecionada={vm.telhaEscolhida || null}
        telhaUnidades={telhaUnidades}
        /** NOVO: dados para popular os combobox das 3 tabelas */
        catalogo={catalogoSafe}
        componentes={componentesSafe}
      />
    </PageLayout>
  )
}
