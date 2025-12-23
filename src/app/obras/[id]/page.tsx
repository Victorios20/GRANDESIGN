import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type {
  ObraDetalheDTO,
  ObraInfosVM,
  FormaPagamento,
  PagamentoStatus,
  PedidoCompraVM,
  ObraStatus,
  PedidoStatusPadrao,
  PedidoStatusMateriais,
  PedidoStatusAndaimes,
} from "@/app/obras/lib/types"

// catálogos/combos (SSR)
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Obras · Detalhe" }

type Option = { value: string; label: string }

/* ===== Normalizações vindas do back (UPPER_CASE) -> UI ===== */
function mapObraStatus(raw: unknown): ObraStatus {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "ASSINATURA_DE_CONTRATO":
      return "Assinatura de contrato"
    case "AGUARDANDO_VALIDACAO_TECNICA":
      return "Aguardando validação técnica"
    case "COMPRAS":
      return "Compras"
    case "A_INICIAR":
      return "À iniciar"
    case "EXECUCAO":
      return "Execução"
    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento"
    case "PENDENCIA":
      return "Pendência"
    case "FINALIZADO":
      return "Finalizado"
    default:
      return "Assinatura de contrato"
  }
}

function mapFormaPagamento(raw: unknown): FormaPagamento | null {
  const s = String(raw ?? "").trim().toLowerCase()
  if (!s) return null
  if (s === "pix") return "Pix"
  if (s === "6x") return "6x"
  if (s === "10x") return "10x"
  if (s === "12x") return "12x"
  if (s === "16x") return "16x"
  return null
}

function mapStatusPagamento(raw: unknown): PagamentoStatus {
  const s = String(raw ?? "").trim().toUpperCase()
  return s === "EFETUADO" ? "Efetuado" : "Pendente"
}

function mapPedidoStatusPadrao(raw: unknown): PedidoStatusPadrao {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento"
    case "PEDIDO_FEITO":
      return "Pedido feito"
    case "ENTREGUE":
      return "Entregue"
    default:
      return "Pendente"
  }
}

function mapPedidoStatusMateriais(raw: unknown): PedidoStatusMateriais {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "EM_ESTOQUE":
      return "Em estoque"
    case "ENTREGUE":
      return "Entregue"
    default:
      return "Pendente"
  }
}

function mapPedidoStatusAndaimes(raw: unknown): PedidoStatusAndaimes {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "PEDIDO_FEITO":
      return "Pedido feito"
    case "ENTREGUE":
      return "Entregue"
    case "A_COLETAR":
      return "À coletar"
    case "COLETADO":
      return "Coletado"
    default:
      return "Pendente"
  }
}

type CidadeRow = { id: number; nome: string }

function normalizeCidades(payload: unknown): CidadeRow[] {
  const arr =
    (payload as any)?.data ??
    (payload as any)?.items ??
    (payload as any)?.rows ??
    payload

  if (!Array.isArray(arr)) return []

  return arr
    .map((c: any) => {
      const idNum = Number(c?.id)
      const nome = String(c?.nome ?? "").trim()
      if (!Number.isFinite(idNum) || !nome) return null
      return { id: idNum, nome }
    })
    .filter(Boolean) as CidadeRow[]
}

export default async function ObraViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const obraId = Number(idStr)
  if (!Number.isFinite(obraId)) notFound()

  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base = `${proto}://${host}`

  // Obra + Tipos + Catálogos + Fornecedores + Equipes + Cidades
  const [
    resObra,
    resTipos,
    componentes,
    geraisDB,
    telhasDB,
    resFornMadeira,
    resFornAndaimes,
    resEquipes,
    resCidades,
  ] = await Promise.all([
    fetch(`${base}/api/obras/${obraId}/detalhado`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
    fetch(`${base}/api/tipos-obra?page=1&pageSize=100`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
    listarComponentesDB(),
    listarMateriaisGerais(),
    listarTelhas(),
    fetch(`${base}/api/fornecedores?tipo=madeira`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
    fetch(`${base}/api/fornecedores?tipo=andaimes`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
    fetch(`${base}/api/equipes?page=1&pageSize=200`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
    fetch(`${base}/api/cidades`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
  ])

  if (!resObra.ok) notFound()

  const dtoJson = await resObra.json()
  const dto = (dtoJson?.data ?? dtoJson) as ObraDetalheDTO

  // DEBUG SERVER LOG
  // eslint-disable-next-line no-console
  console.log("[/obras/[id]] DTO recebido:", JSON.stringify(dto, null, 2))

  const cidadesRaw = await resCidades.json().catch(() => [])
  const cidades = normalizeCidades(cidadesRaw)
  const cidadeMap = new Map<number, string>(cidades.map((c) => [c.id, c.nome]))

  const tiposRaw = await resTipos.json().catch(() => null)
  const tiposObraOptions: Option[] = Array.isArray(tiposRaw?.data ?? tiposRaw?.items ?? tiposRaw?.options ?? tiposRaw)
    ? (tiposRaw.data ?? tiposRaw.items ?? tiposRaw.options ?? tiposRaw)
        .map((x: any) => {
          const label = x?.tipo_obra ?? x?.nome ?? x?.descricao ?? x?.label ?? ""
          const lab = String(label).trim()
          return lab ? { value: lab, label: lab } : null
        })
        .filter(Boolean)
    : []

  // telhas do catálogo
  const telhaOptions: Option[] = Array.from(
    new Set((telhasDB ?? []).map((m) => String(m?.descricao ?? "").trim()).filter(Boolean))
  ).map((n) => ({ value: n, label: n }))

  const cidadeIdDTO = dto?.cliente?.cidade?.id ?? null
  const cidadeNomeDTO = dto?.cliente?.cidade?.nome ?? null
  const cidadeNomeFinal =
    (cidadeNomeDTO ? String(cidadeNomeDTO).trim() : "") ||
    (Number.isFinite(Number(cidadeIdDTO)) && cidadeIdDTO != null ? cidadeMap.get(Number(cidadeIdDTO)) ?? "" : "")

  // ===== Infos Gerais =====
  const initial: Partial<ObraInfosVM> = {
    titulo: dto.titulo ?? "",
    tipoObra: dto.dadosObra?.tipoObra ?? "",
    largura: dto.dadosObra?.largura ?? 0,
    comprimento: dto.dadosObra?.comprimento ?? 0,
    telhaEscolhida: dto.dadosObra?.telhaEscolhida ?? "",
    status: mapObraStatus(dto.dadosObra?.status),
    cliente: {
      id: dto.cliente?.id ?? undefined,
      nome: dto.cliente?.nome ?? "",
      telefone: dto.cliente?.telefone ?? "",
      cpf: dto.cliente?.cpf ?? "",
      bairro: dto.cliente?.bairro ?? "",
      cidadeId: dto.cliente?.cidade?.id ?? null,
      cidade: cidadeNomeFinal || "",
    },
    endereco: {
      logradouro: dto.dadosObra?.endereco ?? "",
      bairro: dto.cliente?.bairro ?? "",
      cidade: cidadeNomeFinal || "",
      mapsUrl: dto.dadosObra?.mapsUrl ?? "",
    },
    observacoes: dto.dadosObra?.observacoes ?? null,
  }

  // ===== Catálogo para comboboxes do Pedido de Compra =====
  const catalogo = {
    madeiras: [] as { nome: string; preco: number }[],
    materiaisGerais: geraisDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
    telhas: telhasDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
  }

  // Fornecedores -> Options
  const toOptions = (arr: any[]): Option[] =>
    Array.isArray(arr)
      ? arr
          .map((f: any) => {
            const label = String(f?.nome ?? f?.razao_social ?? f?.label ?? "").trim()
            const value = String(f?.id ?? f?.fornecedor_id ?? label)
            return label ? { value, label } : null
          })
          .filter(Boolean) as Option[]
      : []

  const fornecedoresMadeiraJson = await resFornMadeira.json().catch(() => [])
  const fornecedoresAndaimesJson = await resFornAndaimes.json().catch(() => [])

  const fornecedoresMadeiraOptions: Option[] = toOptions((fornecedoresMadeiraJson as any)?.data ?? fornecedoresMadeiraJson)
  const fornecedoresAndaimesOptions: Option[] = toOptions((fornecedoresAndaimesJson as any)?.data ?? fornecedoresAndaimesJson)

  // Equipes -> Options
  const equipesJson = await resEquipes.json().catch(() => ({ data: [] }))
  const equipesOptions: Option[] = Array.isArray(equipesJson?.data)
    ? (equipesJson.data as any[])
        .map((e: any) => {
          const label = String(e?.nome ?? "").trim()
          const value = String(e?.id ?? "")
          return label ? { value, label } : null
        })
        .filter(Boolean) as Option[]
    : []

  // ===== Anexos (VIEW/EDIT)
  const orcId = dto?.orcamento?.id
  const orcamentoLink = Number.isFinite(orcId) && orcId ? `${proto}://${host}/orcamento/detalhes/${orcId}` : ""

  const anexosInit = {
    orcamento: orcamentoLink,
    proposta: String(dto?.anexos?.propostaSlide ?? ""),
    contrato: String(dto?.anexos?.contrato ?? ""),
    ordemServico: String(dto?.anexos?.ordemServico ?? ""),
  }

  // ✅ ID da Ordem de Serviço (para montar /ordemServico/{id} no Anexos depois)
  const ordemServicoIdRaw =
    (dto as any)?.ordemServico?.id ??
    (dto as any)?.ordemServico?.ordemServicoId ??
    (dto as any)?.ordem_servico?.id

  const ordemServicoId =
    Number.isFinite(Number(ordemServicoIdRaw)) ? Number(ordemServicoIdRaw) : null

  // ===== Financeiro -> FinanceiroVM =====
  const fin = (dto as any)?.financeiro ?? {}
  const financeiroInit = {
    valorObra: Number(dto?.dadosObra?.valorObra ?? 0),
    maoDeObra: Number(dto?.dadosObra?.valorMaoDeObra ?? 0),
    pagamento: {
      entrada: {
        valor: Number(fin?.entrada?.valor ?? 0),
        forma: mapFormaPagamento(fin?.entrada?.forma),
        status: mapStatusPagamento(fin?.entrada?.status),
      },
      quitacao: {
        valor: Number(fin?.quitacao?.valor ?? 0),
        forma: mapFormaPagamento(fin?.quitacao?.forma),
        status: mapStatusPagamento(fin?.quitacao?.status),
      },
    },
  }

  // ===== Pedido de Compra -> PedidoCompraVM (com status mapeado) =====
  const pc = dto?.pedidoCompra
  const pedidoInit: Partial<PedidoCompraVM> | undefined = pc
    ? {
        telha: {
          status: mapPedidoStatusPadrao(pc.telha?.status),
          previsao: pc.telha?.previsao ?? null,
          orcamento: Number(pc.telha?.orcamento ?? 0),
          area: Number(pc.telha?.area ?? 0),
          itens: Array.isArray(pc.itens?.telha)
            ? pc.itens.telha.map((it) => ({
                id: it.id,
                descricao: it.descricao,
                quantidade: Number(it.quantidade ?? 0),
                precoUnitario: Number(it.precoUnitario ?? 0),
                total: Number(it.total ?? 0),
              }))
            : [],
        },
        madeira: {
          status: mapPedidoStatusPadrao(pc.madeira?.status),
          previsao: pc.madeira?.previsao ?? null,
          fornecedorId: pc.fornecedores?.madeira?.id ?? null,
          orcamento: Number(pc.madeira?.orcamento ?? 0),
          itens: Array.isArray(pc.itens?.madeira)
            ? pc.itens.madeira.map((it) => ({
                id: it.id,
                componente: it.componente,
                madeiraNome: it.madeiraNome,
                descricao: it.descricao,
                quantidade: Number(it.quantidade ?? 0),
                tamanho: Number(it.tamanho ?? 0),
                precoUnitario: Number(it.precoUnitario ?? 0),
                total: Number(it.total ?? 0),
              }))
            : [],
        },
        materiais: {
          status: mapPedidoStatusMateriais(pc.materiais?.status),
          itens: Array.isArray(pc.itens?.materiais)
            ? pc.itens.materiais.map((it) => ({
                id: it.id,
                descricao: it.descricao,
                quantidade: Number(it.quantidade ?? 0),
                precoUnitario: Number(it.precoUnitario ?? 0),
                total: Number(it.total ?? 0),
              }))
            : [],
        },
        andaimes: {
          status: mapPedidoStatusAndaimes(pc.andaimes?.status),
          fornecedorId: pc.fornecedores?.andaimes?.id ?? null,
          itens: Array.isArray(pc.itens?.andaimes)
            ? pc.itens.andaimes.map((it) => ({
                id: it.id,
                descricao: it.descricao,
                quantidade: Number(it.quantidade ?? 0),
                precoUnitario: Number(it.precoUnitario ?? 0),
                total: Number(it.total ?? 0),
              }))
            : [],
        },
      }
    : undefined

  // ===== Execução (ordem de serviço) — fallback da equipe da obra quando OS = null =====
  const execucaoInit =
    dto?.ordemServico
      ? {
          equipeId: dto.ordemServico.equipe?.id ?? dto.ordemServico.equipeId ?? null,
          dataPrevInicio: dto.ordemServico.dataPrevInicio ?? null,
          dataPrevConclusao: dto.ordemServico.dataPrevConclusao ?? null,
        }
      : {
          equipeId: dto?.equipe?.id ?? null,
          dataPrevInicio: null,
          dataPrevConclusao: null,
        }

  return (
    <ObrasPage
      mode="view"
      obraId={obraId}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
      pedidoInit={pedidoInit}
      catalogo={catalogo}
      componentes={componentes}
      fornecedoresMadeiraOptions={fornecedoresMadeiraOptions}
      fornecedoresAndaimesOptions={fornecedoresAndaimesOptions}
      equipeOptions={equipesOptions}
      anexosInit={anexosInit}
      financeiroInit={financeiroInit}
      execucaoInit={execucaoInit}
      cidades={cidades}
      ordemServicoId={ordemServicoId}
    />
  )
}
