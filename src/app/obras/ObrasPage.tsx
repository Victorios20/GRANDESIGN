"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Pencil, X } from "lucide-react"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
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

type Option = { value: string; label: string }
type VM = ObraInfosVM & { imagens?: ImgItem[] }

type CatalogoItem = { nome: string; preco: number }
type Catalogo = {
  madeiras: CatalogoItem[]
  materiaisGerais: CatalogoItem[]
  telhas: CatalogoItem[]
}
type Componente = { id?: number; nome: string; categoria?: string } | any

type Props = {
  mode: "new" | "view"
  obraId?: number
  orcamentoId?: number
  initial: Partial<ObraInfosVM> & { imagens?: ImgItem[] }
  tiposObraOptions: Option[]
  telhaOptions: Option[]
  pedidoInit?: Partial<PedidoCompraVM>
  catalogo?: Catalogo
  componentes?: Componente[]
  fornecedoresMadeiraOptions?: Option[]
  fornecedoresAndaimesOptions?: Option[]

  /** Financeiro inic.:
   *  - create: pode vir só { maoDeObra }
   *  - view/edit: pode vir completo
   */
  financeiroInit?: Partial<FinanceiroVM>

  /** Execução:
   *  - create: normalmente vazio (sem pré-preenchimento)
   *  - view/edit: pode vir completo (equipe + datas)
   */
  execucaoInit?: {
    equipeId?: number | null
    dataPrevInicio?: string | null
    dataPrevConclusao?: string | null
  }

  /** Opções do combobox de equipe (virá do SSR quando o endpoint existir) */
  equipeOptions?: Option[]

  /** Links estáticos do card de Anexos (se vierem, o card usa exatamente estes valores).
   *  - create: normalmente virá { orcamento, proposta }, contrato/ordemServico vazios
   *  - view/edit: podem vir todos preenchidos
   */
  anexosInit?: {
    orcamento?: string | null
    proposta?: string | null
    contrato?: string | null
    ordemServico?: string | null
  }
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

function parseMaybeDate(s?: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

/** hidratação do Financeiro a partir do prop `financeiroInit` */
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

/** hidratação do estado da Execução */
function hydrateExecucao(exec?: Props["execucaoInit"]): ExecucaoVM {
  return {
    equipeId: exec?.equipeId ?? null,
    dataPrevInicio: parseMaybeDate(exec?.dataPrevInicio) ?? null,
    dataPrevConclusao: parseMaybeDate(exec?.dataPrevConclusao) ?? null,
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
  catalogo,
  componentes,
  fornecedoresMadeiraOptions,
  fornecedoresAndaimesOptions,
  financeiroInit,
  execucaoInit,
  equipeOptions = [],
  anexosInit,
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(mode === "new")
  const [saving, setSaving] = useState(false)

  const [vm, setVm] = useState<VM>(() => hydrateInfos(initial))
  const [pedido, setPedido] = useState<PedidoCompraVM>(() => hydratePedido(pedidoInit))
  const [fin, setFin] = useState<FinanceiroVM>(() => hydrateFinanceiro(financeiroInit))
  const [exec, setExec] = useState<ExecucaoVM>(() => hydrateExecucao(execucaoInit))

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
          // se o backend do POST aceitar, já enviamos:
          valor_obra: Number(fin.valorObra ?? 0),
          valor_mao_de_obra: Number(fin.maoDeObra ?? 0),
          observacoes: vm.observacoes ?? null,
          actorUserId: 0,
          clienteCpf: vm.cliente?.cpf ?? null,
        }
        const r = await createObra(payload)
        toast.success("Obra criada.")
        router.push(`/obras/${r.obraId}`)
      } else if (obraId) {
        const ordemServico: OrdemServicoPayload = {
          equipe_id: exec.equipeId ?? undefined,
          data_prev_inicio: exec.dataPrevInicio ?? undefined,
          data_prev_conclusao: exec.dataPrevConclusao ?? undefined,
        }

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
          financeiro: {
            valor_obra: Number(fin.valorObra ?? 0),
            valor_mao_de_obra: Number(fin.maoDeObra ?? 0),
            pagamento_entrada: Number(fin.pagamento?.entrada?.valor ?? 0),
            forma_pagamento_entrada: fin.pagamento?.entrada?.forma || "",
            status_pagamento_entrada: fin.pagamento?.entrada?.status as any,
            pagamento_quitacao: Number(fin.pagamento?.quitacao?.valor ?? 0),
            forma_pagamento_quitacao: fin.pagamento?.quitacao?.forma || "",
            status_pagamento_quitacao: fin.pagamento?.quitacao?.status as any,
          },
          ordemServico,
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
    setFin(hydrateFinanceiro(financeiroInit))
    setExec(hydrateExecucao(execucaoInit))
    setIsEditing(false)
  }

  // ====== LINKS para o card Anexos ======
  const orcamentoLinkFinal = useMemo(() => {
    // 1) preferir o que veio do SSR
    if (anexosInit?.orcamento) return anexosInit.orcamento
    // 2) fallback: se só temos o ID do orçamento (modo "new"), monta a URL local
    if (typeof window !== "undefined" && orcamentoId) {
      return `${window.location.origin}/orcamento/detalhes/${orcamentoId}`
    }
    return ""
  }, [anexosInit?.orcamento, orcamentoId])

  const propostaLinkFinal = anexosInit?.proposta ?? ""
  const contratoLinkFinal = anexosInit?.contrato ?? ""
  const ordemServicoLinkFinal = anexosInit?.ordemServico ?? ""

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

      {/* Card 3 — Pedido de Compra */}
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

      {/* Linha: Financeiro (2/3) + Execução (1/3) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Financeiro
          className="lg:col-span-2"
          value={fin}
          onChange={patchFinanceiro}
          isEditing={isEditing}
        />

        <Execucao
          className="lg:col-span-1"
          value={exec}
          onChange={patchExecucao}
          isEditing={isEditing}
          equipeOptions={equipeOptions}
        />
      </div>

      {/* Card 4 — Anexos (sempre estático; largura total; ao final da página) */}
      <div className="mt-6">
        <Anexos
          mode={mode}
          orcamentoLink={orcamentoLinkFinal}
          propostaLink={propostaLinkFinal}
          contratoLink={contratoLinkFinal}
          ordemServicoLink={ordemServicoLinkFinal}
        />
      </div>
    </PageLayout>
  )
}
