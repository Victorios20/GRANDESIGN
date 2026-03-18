// app/obras/ObrasClient.tsx
"use client"

import { useSession } from "next-auth/react"

import { useEffect, useMemo, useState, useRef } from "react"
import Link from "next/link"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"

import { EllipsisVertical, Eye, Copy, ShoppingCart, FileText, User, CalendarDays, Search } from "lucide-react"
import { toast } from "sonner"

import FilterCardObras, { STATUS_OPTIONS } from "@/components/obras/FilterCardObras"
import { ObraStatusBadge } from "@/components/obras/ObraStatusBadge"
import type { FilterStateObras } from "@/components/obras/FilterCardObras"

import MUIDataTable, { MUIDataTableColumnDef, MUIDataTableOptions } from "mui-datatables"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { GlobalStyles } from "@mui/material"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { deleteObraDB } from "@/actions/obras/delete-obra-db"
import { Trash2, Check, ChevronDown, Filter, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  cor_stain?: string | null

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
const VERDE_CLARO = "#EBF0EC"
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
  const [nome, setNome] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [bairro, setBairro] = useState<string>("")
  const [dataIni, setDataIni] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [telefone, setTelefone] = useState("")
  const [tipoObra, setTipoObra] = useState("")
  const [status, setStatus] = useState<ObraStatusFilter[]>([])

  const [obras, setObras] = useState<ObraRow[]>(
    (initial.dados ?? []).map((o, i) => ({
      id: (o as any)?.id ?? i,
      ...(o as any),
    }))
  )

  const { data: session } = useSession()
  const roles = (session?.user as any)?.roles ?? []
  const canDelete = roles.includes("ADMIN") || roles.includes("DEV")

  const [total, setTotal] = useState<number>(initial.total ?? 0)
  const [loadingTabela, setLoadingTabela] = useState(false)

  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(20)

  const [orderBy, setOrderBy] = useState<string>("data_criacao")
  const [ordem, setOrdem] = useState<"asc" | "desc">("desc")

  // State for delete dialog
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const cacheConsultar = useRef<Map<string, { dados: ObraRow[]; total: number }>>(new Map())


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
  }, [nome, bairro, telefone, tipoObra, dataIni, dataFim, page, perPage, status, orderBy, ordem])

  function formatLocalDate(date?: Date | null) {
    if (!date || Number.isNaN(date.getTime())) return undefined

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  async function consultar() {
    setLoadingTabela(true)

    const dIniISO = formatLocalDate(dataIni)
    const dFimISO = formatLocalDate(dataFim)

    const qs = new URLSearchParams()
    qs.set("page", String(page + 1))
    qs.set("perPage", String(perPage))
    if (nome) qs.set("search", nome)
    if (bairro) qs.set("bairro", bairro)
    if (telefone) qs.set("telefone", telefone)
    if (tipoObra) qs.set("tipoObra", tipoObra)
    if (dIniISO) qs.set("dIni", dIniISO)
    if (dFimISO) qs.set("dFim", dFimISO)
    if (status && status.length > 0) {
      status.forEach(s => qs.append("status", String(s)))
    }
    qs.set("orderBy", orderBy)
    qs.set("ordem", ordem)

    const key = qs.toString()
    if (cacheConsultar.current.has(key)) {
      const cached = cacheConsultar.current.get(key)!
      setObras(cached.dados)
      setTotal(cached.total)
      setLoadingTabela(false)
      return
    }

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

    cacheConsultar.current.set(key, { dados: mapped, total: Number(json.total ?? 0) })
    setObras(mapped)
    setTotal(Number(json.total ?? 0))
    setLoadingTabela(false)

  }

  async function handleDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await deleteObraDB(deleteId)
      if (res.success) {
        toast.success("Obra excluída com sucesso!")
        setDeleteId(null)
        // Clear cache on mutation
        cacheConsultar.current.clear()
        // Refresh table
        consultar()

      } else {
        toast.error(`Erro: ${res.error}`)
      }
    } catch {
      toast.error("Erro inesperado ao excluir obra")
    } finally {
      setIsDeleting(false)
    }
  }

  function limparFiltros() {
    setNome("")
    setSearchInput("")
    setBairro("")
    setTelefone("")
    setTipoObra("")
    setDataIni(undefined)
    setDataFim(undefined)
    setStatus([])
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
        sort: true,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.titulo ?? null),
      },
    },
    {
      name: "status",
      label: "Status",
      options: {
        sort: true,
        searchable: false,
        customBodyRender: (_val, meta) => {
          const r = rows[meta.rowIndex]
          return (
            <div className="flex min-h-10 items-center py-1">
              <ObraStatusBadge status={r?.status ?? null} layout="multiline" />
            </div>
          )
        },
      },
    },
    {
      name: "cliente",
      label: "Cliente",
      options: {
        sort: true,
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
        sort: true,
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
        sort: true,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell((rows[meta.rowIndex] as any)?.tipo_obra ?? null),
      },
    },
    {
      name: "cor_stain",
      label: "Cor do Stain",
      options: {
        display: "false",
        sort: true,
        searchable: true,
        customBodyRender: (_val, meta) => {
          const cor = (rows[meta.rowIndex] as any)?.cor_stain
          if (!cor) return <span className="text-marromClaro">—</span>
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border border-[#376139]/30 text-[#376139] bg-[#f4f4f4] whitespace-nowrap">
              {cor}
            </span>
          )
        },
      },
    },
    {
      name: "equipe",
      label: "Equipe",
      options: {
        sort: true,
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
      name: "data_criacao",
      label: "Data de Criação",
      options: {
        sort: true,
        searchable: false,
        customBodyRender: (_val, meta) => strDate((rows[meta.rowIndex] as any)?.data_criacao ?? null),
      },
    },
    {
      name: "data_ultima_alteracao",
      label: "Data da Atualização",
      options: {
        sort: true,
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

                  {canDelete && (
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-700"
                      onSelect={(e) => {
                        e.preventDefault()
                        if (obraId) setDeleteId(obraId)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Obra
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    },
  ]

  const options: MUIDataTableOptions = {
    search: false,
    filter: false,
    print: false,
    download: false,
    viewColumns: false,
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
      if (action === "sort") {
        const activeSort = tableState.sortOrder
        if (activeSort) {
          setOrderBy(activeSort.name)
          setOrdem(activeSort.direction as "asc" | "desc")
        } else {
          setOrderBy("data_criacao")
          setOrdem("desc")
        }
      }
    },
    sortOrder: {
      name: orderBy,
      direction: ordem,
    },
    sort: true,
    elevation: 0,
    setTableProps: () => ({ style: { borderRadius: 0, overflow: "hidden" } }),
    onRowClick: (_rowData, rowMeta) => {
      const id = rows[rowMeta.dataIndex]?.id
      if (id != null) window.open(`/obras/${id}`, '_blank')
    },
    setRowProps: () => ({
      className: "obras-table-row cursor-pointer",
    }),
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: VERDE_HEADER },
          text: { primary: CINZA_TEXTO },
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

          MuiTableHead: { styleOverrides: { root: { backgroundColor: VERDE_HEADER } } },
          MuiTableRow: { styleOverrides: { head: { backgroundColor: VERDE_HEADER, height: 36 } } },

          MUIDataTableHeadCell: {
            styleOverrides: {
              sortActive: {
                color: "#f4f4f4 !important",
              },
              sortAction: {
                "& .MuiTableSortLabel-root, & .MuiTableSortLabel-icon": {
                  color: "#f4f4f4 !important",
                  opacity: "1 !important",
                },
              },
            },
          },

          MuiTableSortLabel: {
            styleOverrides: {
              root: {
                color: "#f4f4f4 !important",
                opacity: 1,
                "&:hover": { color: "#ffffff !important" },
                "&.Mui-active": { color: "#ffffff !important" },
                "&.Mui-active .MuiTableSortLabel-icon": { color: "#ffffff !important" },
              },
              icon: {
                color: "#ffffff !important",
              },
            },
          },

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
                "&.MuiTableCell-head": {
                  color: "#f4f4f4",
                },
                "& .MUIDataTableHeadCell-sortActive": {
                  color: "#f4f4f4 !important",
                },
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
              root: { color: VERDE_HEADER, "&.Mui-checked": { color: VERDE_HEADER } },
            },
          },
          MuiFormControlLabel: { styleOverrides: { label: { color: CINZA_TEXTO } } },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                color: CINZA_TEXTO,
                "&.Mui-selected, &.Mui-selected:hover": {
                  backgroundColor: "rgba(55,97,57,0.12)",
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
    ini: formatLocalDate(dataIni),
    fim: formatLocalDate(dataFim),
    pageSize: perPage as any,
  }

  return (
    <PageLayout headerActions={headerActions} isTitulo>
      <TooltipProvider>
        <Card ultraCompact>
          <CardHeader className="pb-0 pt-4 px-4 sm:px-6">
            {/* Título */}
            <div className="flex items-baseline gap-3 mb-4">
              <CardTitle className="text-xl font-bold tracking-tight" style={{ color: VERDE_HEADER }}>Obras</CardTitle>
              <span className="text-xs font-medium" style={{ color: CINZA_TEXTO }}>
                {total} resultado{total !== 1 ? "s" : ""}
              </span>
            </div>
 
            {/* Barra de busca + filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[#376139]/50" />
                <Input
                  placeholder="Pesquisar por Título, cliente, bairro ou telefone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setNome(searchInput)
                      setPage(0)
                    }
                  }}
                  className="pl-9 pr-10 h-10 rounded-sm border-[#737373]/30 focus:border-[#376139] focus:ring-1 focus:ring-[#376139]/20 transition-all font-medium text-[#376139] placeholder:text-[#737373]/60 w-full"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setNome(""); setPage(0) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-[#737373] hover:text-[#376139]"
                    aria-label="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>
 
              {/* Filtro de Status Multi-select */}
              <div className="shrink-0 min-w-[180px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      className="w-full h-10 px-4 justify-between rounded-lg border-none bg-[#EBF0EC] text-[#376139] font-medium hover:bg-[#376139]/20 transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden truncate">
                        <Filter className="h-4 w-4 shrink-0 opacity-80" />
                        {status.length === 0 ? "Todos os Status" : (
                          <div className="flex gap-1 overflow-hidden">
                            {status.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="h-5 px-1 font-normal text-[10px] bg-green/10 text-green border-green/20 whitespace-nowrap"
                              >
                                {STATUS_OPTIONS.find(o => o.value === s)?.label || s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Filtrar status..." h-9 />
                      <CommandList>
                        <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
                        <CommandGroup>
                          {STATUS_OPTIONS.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              onSelect={() => {
                                const next = status.includes(opt.value as any)
                                  ? status.filter(s => s !== opt.value)
                                  : [...status, opt.value as any]
                                setStatus(next)
                                setPage(0)
                              }}
                              className="cursor-pointer"
                            >
                              <div className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                status.includes(opt.value as any) ? "bg-primary text-primary-foreground" : "opacity-50"
                              )}>
                                {status.includes(opt.value as any) && <Check className="h-3 w-3" />}
                              </div>
                              <span>{opt.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
 
              <div className="flex items-center gap-2 shrink-0">
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
                    // Status agora é mantido fora do FilterCard, mas mantemos o onChange se necessário
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
                    ".MUIDataTableToolbar-root": { display: "none !important" },

                    // Cabeçalho da tabela com o verde suave
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

                    // Corrige a cor do texto quando a coluna está ordenada ativamente
                    ".MuiTableSortLabel-root, .MuiTableSortLabel-root:hover, .MuiTableSortLabel-root.Mui-active, .MuiTableSortLabel-root.Mui-active .MuiTableSortLabel-icon": {
                      color: "#f4f4f4 !important",
                    },
                    ".MuiTableSortLabel-icon": {
                      color: "#f4f4f4 !important",
                      opacity: "0.8 !important",
                    },

                    /* Minimalist row hover: left accent bar + subtle bg */
                    ".obras-table-row:hover td": {
                      backgroundColor: "#F4F8F4 !important",
                      transition: "background-color 0.15s ease",
                    },
                    ".obras-table-row:hover td:first-child": {
                      boxShadow: "inset 3px 0 0 " + VERDE_HEADER,
                    },
                    /* Remove default bottom border of last row */
                    ".MuiTableBody-root .MuiTableRow-root:last-child td": {
                      borderBottom: "none",
                    },

                  }}
                />
                <MUIDataTable title={""} data={rows as any} columns={columns} options={options} />
              </ThemeProvider>
            )}
          </CardContent>
        </Card>
      </TooltipProvider>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta obra? Esta ação removerá a obra e todos os dados vinculados (pedidos, imagens, agendamentos) permanentemente. Clientes e orçamentos vinculados não serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
