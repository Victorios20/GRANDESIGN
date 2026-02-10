// app/obras/ObrasClient.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"

import { EllipsisVertical, Eye, Copy, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import FilterCardObras from "@/components/obras/FilterCardObras"
import type { FilterStateObras } from "@/components/obras/FilterCardObras"

import MUIDataTable, { MUIDataTableColumnDef, MUIDataTableOptions } from "mui-datatables"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { GlobalStyles } from "@mui/material"

type ClienteDTO = {
  id: number
  nome: string
  telefone?: string | null
  bairro?: string | null
  cpf?: string | null
  cidade?: { id?: number | null; nome?: string | null } | null
  cidade_id?: number | null
  cidades?: { id?: number | null; nome?: string | null } | null
}

type EquipeDTO = {
  id: number
  nome: string
}

type ObraRow = {
  id: number
  titulo?: string | null
  status?: string | null

  orcamentoId?: number | null
  orcamento_id?: number | null

  clienteId?: number | null
  cliente_id?: number | null
  cliente?: ClienteDTO | null

  equipeId?: number | null
  equipe_id?: number | null
  equipe?: EquipeDTO | null

  ordemServicoId?: number | null
  ordem_servico_id?: number | null

  pedidosCompraIds?: number[]
  pedidos_compra_ids?: number[]

  imagensIds?: number[]
  imagens_ids?: number[]

  endereco_obra?: string | null
  maps_url?: string | null
  tipo_obra?: string | null
  largura?: number | string | null
  comprimento?: number | string | null
  telha_escolhida?: string | null

  valor_obra?: number | string | null
  valor_mao_de_obra?: number | string | null

  observacoes?: string | null

  pagamento_entrada?: number | string | null
  forma_pagamento_entrada?: string | null
  status_pagamento_entrada?: string | null

  pagamento_quitacao?: number | string | null
  forma_pagamento_quitacao?: string | null
  status_pagamento_quitacao?: string | null

  link_slide_orcamento?: string | null
  link_pdf_orcamento?: string | null
  link_contrato?: string | null
  link_ordem_servico?: string | null

  created_by?: number | null
  updated_by?: number | null
  data_criacao?: string | null
  data_ultima_alteracao?: string | null
}

type InitialData = {
  listaBairros?: string[]
  dados: ObraRow[]
  total: number
}

const BEGE = "#E8C99A"
const MARROM = "#8B5E3C"
const VERDE_HEADER = "#376139"
const CINZA_TEXTO = "#737373"


export type ObraStatusFilter =
  | ""
  | "ASSINATURA_DE_CONTRATO"
  | "AGUARDANDO_VALIDACAO_TECNICA"
  | "COMPRAS"
  | "A_INICIAR"
  | "EXECUCAO"
  | "AGUARDANDO_PAGAMENTO"
  | "PENDENCIA"
  | "FINALIZADO"

export default function ObrasClient({ initial }: { initial: InitialData }) {
  const router = useRouter()

  const [nome, setNome] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [bairro, setBairro] = useState<string>("")
  const [dataIni, setDataIni] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [telefone, setTelefone] = useState("")
  const [tipoObra, setTipoObra] = useState("")
  const [status, setStatus] = useState<ObraStatusFilter>("")

  const [obras, setObras] = useState<ObraRow[]>(
    (initial.dados ?? []).map((o, i) => ({
      id: (o as any)?.id ?? i,
      ...(o as any),
    }))
  )

  const [total, setTotal] = useState<number>(initial.total ?? 0)
  const [loadingTabela, setLoadingTabela] = useState(false)

  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    if (nome.trim() && page !== 0) setPage(0)
  }, [nome, page])

  useEffect(() => {
    consultar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setNome(searchInput)
      setPage(0)
    }, 450)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    consultar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, bairro, telefone, tipoObra, dataIni, dataFim, page, perPage, status])

  async function consultar() {
    setLoadingTabela(true)

    const dIniISO = dataIni?.toISOString().slice(0, 10)
    const dFimISO = dataFim?.toISOString().slice(0, 10)

    const qs = new URLSearchParams()
    qs.set("page", String(page + 1))
    qs.set("perPage", String(perPage))
    if (nome) qs.set("search", nome)
    if (bairro) qs.set("bairro", bairro)
    if (telefone) qs.set("telefone", telefone)
    if (tipoObra) qs.set("tipoObra", tipoObra)
    if (dIniISO) qs.set("dIni", dIniISO)
    if (dFimISO) qs.set("dFim", dFimISO)
    if (status) qs.set("status", status)

    const res = await fetch(`/api/obras/table-search?${qs.toString()}`, { cache: "no-store" })
    if (!res.ok) {
      setObras([])
      setTotal(0)
      setLoadingTabela(false)
      return
    }

    const json = await res.json()
    const dadosRaw = (json.dados ?? []) as any[]
    const mapped: ObraRow[] = dadosRaw.map((o, i) => ({
      id: o?.id ?? i,
      ...o,
    }))

    setObras(mapped)
    setTotal(Number(json.total ?? 0))
    setLoadingTabela(false)
  }

  function limparFiltros() {
    setNome("")
    setSearchInput("")
    setBairro("")
    setTelefone("")
    setTipoObra("")
    setDataIni(undefined)
    setDataFim(undefined)
    setStatus("")
    setPage(0)
  }

  const safeCell = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : v)

  const strDate = (s?: string | null) => {
    if (!s) return "-"
    const naive = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (naive) {
      const [, Y, M, D, hh, mm] = naive
      return `${D}/${M}/${Y} ${hh}:${mm}`
    }
    const d = new Date(s)
    if (isNaN(d.getTime())) return String(s)
    return d
      .toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "")
  }

  const statusLabel = (raw?: string | null) => {
    const s = String(raw ?? "").trim()
    if (!s) return "-"
    const map: Record<string, string> = {
      ASSINATURA_DE_CONTRATO: "Assinatura de contrato",
      AGUARDANDO_VALIDACAO_TECNICA: "Aguardando validação técnica",
      COMPRAS: "Compras",
      A_INICIAR: "À iniciar",
      EXECUCAO: "Execução",
      AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
      PENDENCIA: "Pendência",
      FINALIZADO: "Finalizado",
    }
    return map[s] ?? s
  }

  const rows: ObraRow[] = useMemo(
    () =>
      (obras ?? []).map((o, i) =>
        (o as any).id != null ? (o as ObraRow) : ({ id: i, ...(o as any) } as ObraRow)
      ),
    [obras]
  )

  const columns: MUIDataTableColumnDef[] = [
    {
      name: "id",
      label: "id",
      options: {
        sort: false,
        filter: false,
        searchable: false,
        display: "excluded",
        viewColumns: false,
        download: false,
        print: false,
      },
    },
    {
      name: "titulo",
      label: "Título",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.titulo ?? null),
      },
    },
    {
      name: "status",
      label: "Status",
      options: {
        sort: false,
        searchable: false,
        customBodyRender: (_val, meta) => {
          const r = rows[meta.rowIndex]
          return (
            <span className="font-medium" style={{ color: CINZA_TEXTO }}>
              {statusLabel(r?.status ?? null)}
            </span>
          )

        },
      },
    },
    {
      name: "cliente",
      label: "Cliente",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => {
          const r = rows[meta.rowIndex] as any
          const c = (r?.cliente ?? null) as ClienteDTO | null
          const nomeCli = c?.nome ?? r?.clienteNome ?? r?.cliente_nome ?? r?.cliente?.nome ?? null
          return safeCell(nomeCli)
        },
      },
    },
    {
      name: "bairro",
      label: "Bairro",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => {
          const r = rows[meta.rowIndex] as any
          const c = (r?.cliente ?? null) as ClienteDTO | null
          const b = c?.bairro ?? r?.bairro ?? r?.clienteBairro ?? r?.cliente_bairro ?? null
          return safeCell(b)
        },
      },
    },
    {
      name: "tipo_obra",
      label: "Tipo de obra",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell((rows[meta.rowIndex] as any)?.tipo_obra ?? null),
      },
    },
    {
      name: "equipe",
      label: "Equipe",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => {
          const r = rows[meta.rowIndex] as any
          const e = (r?.equipe ?? null) as EquipeDTO | null
          const nomeEq = e?.nome ?? r?.equipeNome ?? r?.equipe_nome ?? null
          return safeCell(nomeEq)
        },
      },
    },
    {
      name: "data_ultima_alteracao",
      label: "Data da Atualização",
      options: {
        sort: false,
        searchable: false,
        customBodyRender: (_val, meta) => strDate((rows[meta.rowIndex] as any)?.data_ultima_alteracao ?? null),
      },
    },
    {
      name: "acoes",
      label: "Ações",
      options: {
        sort: false,
        searchable: false,
        filter: false,
        customBodyRender: (_val, tableMeta) => {
          const o = rows[tableMeta.rowIndex] as any

          const obraId = Number(o?.id)
          const orcamentoId =
            o?.orcamentoId != null ? Number(o.orcamentoId) : o?.orcamento_id != null ? Number(o.orcamento_id) : null

          const canGoOrc = Number.isFinite(orcamentoId) && (orcamentoId as number) > 0

          return (
            <div
              className="flex justify-end"
              data-no-row-nav
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-marromEscuro hover:bg-marromClaro/20"
                    aria-label="Ações"
                    data-no-row-nav
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EllipsisVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-72"
                  data-no-row-nav
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={async () => {
                      const link = `https://app.grandesignce.com.br/obras/${obraId}`
                      try {
                        await navigator.clipboard.writeText(link)
                        toast.success("Link copiado!")
                      } catch {
                        toast.error("Não foi possível copiar o link.")
                      }
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar link da obra
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="cursor-pointer" data-no-row-nav>
                    <Link href={`/obras/${obraId}`} title="Visualizar obra" target="_blank" rel="noopener noreferrer">
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar obra
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="cursor-pointer" data-no-row-nav>
                    <Link
                      href={`/pedido_compra?IDobra=${obraId}`}
                      title="Ir para pedido de compra"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Ir para Pedido de Compra
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild
                    className={`cursor-pointer ${!canGoOrc ? "opacity-60 pointer-events-none" : ""}`}
                    data-no-row-nav
                  >
                    <Link
                      href={canGoOrc ? `/orcamento/detalhes/${orcamentoId}` : "#"}
                      title="Ver orçamento"
                      target={canGoOrc ? "_blank" : undefined}
                      rel={canGoOrc ? "noopener noreferrer" : undefined}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver orçamento
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    },
  ]

  const options: MUIDataTableOptions = {
    search: true,
    filter: false,
    print: false,
    download: true,
    viewColumns: true,
    responsive: "standard",
    selectableRows: "none",
    serverSide: true,
    count: total,
    page,
    rowsPerPage: perPage,
    rowsPerPageOptions: [5, 10, 20, 50, 100],
    onTableChange: (action, tableState) => {
      if (action === "changePage") setPage(tableState.page)
      if (action === "changeRowsPerPage") {
        setPerPage(tableState.rowsPerPage)
        setPage(0)
      }
      if (action === "search") {
        const q = tableState.searchText || ""
        setSearchInput(q)
      }
    },
    sort: false,
    elevation: 0,
    setTableProps: () => ({ style: { borderRadius: 12, overflow: "hidden" } }),
    onRowClick: (_rowData, rowMeta) => {
      const id = rows[rowMeta.dataIndex]?.id
      if (id != null) router.push(`/obras/${id}`)
    },
    setRowProps: () => ({
      className: "cursor-pointer hover:bg-[rgba(232,201,154,0.15)]",
    }),
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: MARROM },
          text: { primary: MARROM },
        },
        components: {
          MuiToolbar: {
            styleOverrides: {
              root: {
                minHeight: 36,
                paddingLeft: 8,
                paddingRight: 8,
                color: VERDE_HEADER,
              },
            },
          },

          // ✅ só o cabeçalho da tabela com o verde do sistema
          MuiTableHead: { styleOverrides: { root: { backgroundColor: VERDE_HEADER } } },
          MuiTableRow: { styleOverrides: { head: { backgroundColor: VERDE_HEADER, height: 36 } } },

          MuiTableCell: {
            styleOverrides: {
              head: {
                backgroundColor: VERDE_HEADER,
                color: "#f4f4f4",
                fontWeight: 700,
                paddingTop: 6,
                paddingBottom: 6,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              },
              root: {
                color: CINZA_TEXTO,
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                paddingTop: 6,
                paddingBottom: 6,
              },

            },
          },

          MuiIconButton: {
            styleOverrides: {
              root: { color: VERDE_HEADER, "&:hover": { backgroundColor: "rgba(55,97,57,0.12)" } },
              colorPrimary: {
                color: CINZA_TEXTO,
                "&:hover": { backgroundColor: "rgba(55,97,57,0.12)" },
              },
            },
          },

          MuiSvgIcon: { styleOverrides: { root: { color: "inherit" } } },
          MuiCheckbox: {
            styleOverrides: {
              root: { color: MARROM, "&.Mui-checked": { color: BEGE } },
            },
          },
          MuiFormControlLabel: { styleOverrides: { label: { color: MARROM } } },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                color: MARROM,
                "&.Mui-selected, &.Mui-selected:hover": {
                  backgroundColor: "rgba(232,201,154,0.35)",
                },
              },
            },
          },
          MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
        },
      }),
    []
  )

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href="/obras/new">
        <InteractiveHoverButton className="px-4 py-1.5 text-sm rounded-lg shadow-sm hover:shadow-md">
          Nova Obra
        </InteractiveHoverButton>
      </Link>
    </div>
  )

  const filterValue: FilterStateObras = {
    q: nome,
    telefone,
    bairro,
    tipoObra,
    ini: dataIni ? dataIni.toISOString().slice(0, 10) : undefined,
    fim: dataFim ? dataFim.toISOString().slice(0, 10) : undefined,
    pageSize: perPage as any,
    status: status || null,
  }

  return (
    <PageLayout headerActions={headerActions} isTitulo>
      <TooltipProvider>
        <Card ultraCompact>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <CardTitle className="text-2xl leading-tight text-green">Obras</CardTitle>
                <CardDescription className="text-[13px] leading-tight" style={{ color: CINZA_TEXTO }}>
                  Tabela com as obras cadastradas.
                </CardDescription>

              </div>

              <div className="flex items-center gap-2">
                <FilterCardObras
                  value={filterValue}
                  onChange={(next) => {
                    const v = next ?? {}
                    setNome(v.q ?? "")
                    setSearchInput(v.q ?? "")
                    setTelefone(v.telefone ?? "")
                    setBairro(v.bairro ?? "")
                    setTipoObra(v.tipoObra ?? "")
                    if (v.pageSize) setPerPage(Number(v.pageSize))
                    setDataIni(v.ini ? new Date(v.ini) : undefined)
                    setDataFim(v.fim ? new Date(v.fim) : undefined)
                    setStatus((v.status as any) ?? "")
                    setPage(0)
                  }}
                  onApply={() => consultar()}
                  onClear={() => {
                    limparFiltros()
                    consultar()
                  }}
                  pageSizeOptions={[10, 20, 25, 50, 100]}
                  loading={loadingTabela}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-4 px-4 sm:px-6">
            {loadingTabela ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <ThemeProvider theme={theme}>
                <GlobalStyles
                  styles={{
                    ".MUIDataTableToolbar-root": { minHeight: "36px", padding: "0 8px" },

                    // ✅ só o cabeçalho da tabela com o verde do sistema
                    ".MUIDataTableHeadCell-fixedHeader, .MuiTableHead-root, .MuiTableRow-head, .MuiTableCell-head": {
                      backgroundColor: VERDE_HEADER + " !important",
                      color: "#f4f4f4 !important",
                    },

                    ".MUIDataTableToolbar-icon, .MUIDataTableToolbar-iconActive": {
                      color: CINZA_TEXTO + " !important",
                    },
                    ".MUIDataTableToolbar-icon:hover, .MUIDataTableToolbar-iconActive": {
                      backgroundColor: "rgba(55,97,57,0.12) !important",
                    },

                  }}
                />
                <MUIDataTable title={""} data={rows as any} columns={columns} options={options} />
              </ThemeProvider>
            )}
          </CardContent>
        </Card>
      </TooltipProvider>
    </PageLayout>
  )
}
