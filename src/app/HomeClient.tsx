"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { EllipsisVertical, Eye, Pencil, Copy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { BigShinyButton } from "@/components/ui/BigShinyButton"
import { toast, Toaster } from "sonner"
import FilterCard, { type FieldId, type Option, type FilterState } from "./FilterCard"
import { listarBairros } from "./_actions/home.actions"
import type { OrcamentoTabela } from "./_actions/home.actions"

import MUIDataTable, { MUIDataTableColumnDef, MUIDataTableOptions } from "mui-datatables"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { GlobalStyles } from "@mui/material"

type OrcRow = OrcamentoTabela & {
  cidade?: string
  tipoObra?: string
  data_ultima_alteracao?: string
  clienteTelefone?: string
}

type InitialData = {
  listaBairros: string[]
  dados: OrcamentoTabela[]
  total: number
}

const BEGE = "#E8C99A"
const MARROM = "#8B5E3C"

export default function HomeClient({ initial }: { initial: InitialData }) {
  const router = useRouter()

  const [nome, setNome] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [bairro, setBairro] = useState<string>("")
  const [dataIni, setDataIni] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [telefone, setTelefone] = useState("")
  const [cidadeId, setCidadeId] = useState<number | null>(null)
  const [tipoObraId, setTipoObraId] = useState<number | null>(null)

  const [orderBy, setOrderBy] = useState<string | undefined>(undefined)
  const [orderDir, setOrderDir] = useState<"asc" | "desc" | undefined>(undefined)

  const [cidadesOpts, setCidadesOpts] = useState<{ id: number; label: string }[]>([])
  const [tiposOpts, setTiposOpts] = useState<{ id: number; label: string }[]>([])
  const availableFields = useMemo(
    () =>
      ([
        { id: "q", label: "Nome ou Título", type: "text" },
        { id: "telefone", label: "Telefone", type: "text" },
        { id: "bairro", label: "Bairro", type: "text" },
        { id: "cidadeId", label: "Cidade", type: "select", options: cidadesOpts as Option[] },
        { id: "tipoObraId", label: "Tipo de obra", type: "select", options: tiposOpts as Option[] },
        { id: "dateField", label: "Campo de data", type: "segmented" },
        { id: "dateRange", label: "Período", type: "dateRange" },
        { id: "pageSize", label: "Linhas por página", type: "select", options: [5, 10, 20] },
      ] as const),
    [cidadesOpts, tiposOpts]
  )

  const PERSIST_KEY = "gd.historico.filtros.campos.v1"
  const DEFAULT_FIELDS: FieldId[] = ["q", "dateRange", "pageSize", "bairro", "telefone", "cidadeId", "tipoObraId"]

  const [selectedFields, setSelectedFields] = useState<FieldId[]>(() => {
    if (typeof window === "undefined") return DEFAULT_FIELDS
    try {
      const raw = localStorage.getItem(PERSIST_KEY)
      const saved = raw ? (JSON.parse(raw) as FieldId[]) : null
      return Array.isArray(saved) && saved.length ? saved : DEFAULT_FIELDS
    } catch {
      return DEFAULT_FIELDS
    }
  })

  const [orcamentos, setOrcamentos] = useState<OrcamentoTabela[]>(initial.dados ?? [])
  const [total, setTotal] = useState<number>(initial.total ?? 0)
  const [loadingTabela, setLoadingTabela] = useState(false)

  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    if (nome.trim() && page !== 0) setPage(0)
  }, [nome])

  useEffect(() => {
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(selectedFields))
    } catch {}
  }, [selectedFields])

  useEffect(() => {
    listarBairros().catch(() => {})

    ;(async () => {
      try {
        const [rc, rt] = await Promise.all([
          fetch(`/api/cidades?page=1&pageSize=100`).then((r) => r.json()),
          fetch(`/api/tipos-obra?page=1&pageSize=100`).then((r) => r.json()),
        ])

        function toOptions(res: any, labelKeys: string[]): { id: number; label: string }[] {
          const arr = res?.options ?? res?.data ?? res?.items ?? res ?? []
          if (!Array.isArray(arr)) return []
          return arr
            .map((x: any) => {
              const id = Number(x?.id)
              if (!Number.isFinite(id)) return null
              const label =
                labelKeys.map((k) => (typeof x?.[k] === "string" ? x[k] : null)).find(Boolean) ??
                (typeof x?.label === "string" ? x.label : null) ??
                (typeof x?.nome === "string" ? x.nome : null) ??
                (typeof x?.descricao === "string" ? x.descricao : null) ??
                (typeof x?.tipo_obra === "string" ? x.tipo_obra : null) ??
                ""
              const lab = String(label).trim()
              if (!lab) return null
              return { id, label: lab }
            })
            .filter(Boolean) as { id: number; label: string }[]
        }
        setCidadesOpts(toOptions(rc, ["nome", "cidade"]))
        setTiposOpts(toOptions(rt, ["tipo_obra", "nome", "descricao"]))
      } catch {}
    })()

    consultar()
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
  }, [nome, bairro, telefone, cidadeId, tipoObraId, dataIni, dataFim, page, perPage, orderBy, orderDir])

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
    if (cidadeId != null) qs.set("cidadeId", String(cidadeId))
    if (tipoObraId != null) qs.set("tipoObraId", String(tipoObraId))
    if (dIniISO) qs.set("dIni", dIniISO)
    if (dFimISO) qs.set("dFim", dFimISO)
    if (orderBy) qs.set("orderBy", orderBy)
    if (orderDir) qs.set("orderDir", orderDir)

    const res = await fetch(`/api/Orcamentos/table-search?${qs.toString()}`, { cache: "no-store" })
    if (!res.ok) {
      setOrcamentos([])
      setTotal(0)
      setLoadingTabela(false)
      return
    }
    const json = await res.json()
    setOrcamentos(json.dados ?? [])
    setTotal(Number(json.total ?? 0))
    setLoadingTabela(false)
  }

  function limparFiltros() {
    setNome("")
    setSearchInput("")
    setBairro("")
    setTelefone("")
    setCidadeId(null)
    setTipoObraId(null)
    setDataIni(undefined)
    setDataFim(undefined)
    setPage(0)
  }

  const safeCell = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : v)
  const strDate = (iso?: string) => (iso ? format(parseISO(iso), "dd/MM/yyyy HH:mm") : "-")

  const rows: OrcRow[] = useMemo(
    () =>
      (orcamentos ?? []).map((o, i) =>
        (o as any).id != null ? (o as OrcRow) : ({ id: i, ...(o as any) } as OrcRow)
      ),
    [orcamentos]
  )

  const columns: MUIDataTableColumnDef[] = [
    { name: "titulo", label: "Título", options: { sort: true, searchable: true } },
    { name: "cliente", label: "Cliente", options: { sort: true, searchable: true } },
    {
      name: "bairro",
      label: "Bairro",
      options: {
        sort: true,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.bairro),
      },
    },
    {
      name: "cidade",
      label: "Cidade",
      options: {
        sort: true,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.cidade),
      },
    },
    {
      name: "tipoObra",
      label: "Tipo de obra",
      options: {
        sort: true,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.tipoObra),
      },
    },
    {
      name: "data_ultima_alteracao",
      label: "Data da Atualização",
      options: {
        sort: true,
        searchable: false,
        customBodyRender: (_val, meta) => strDate(rows[meta.rowIndex]?.data_ultima_alteracao),
      },
    },
    {
      name: "clienteTelefone",
      label: "Telefone",
      options: {
        sort: false,
        searchable: false,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.clienteTelefone),
      },
    },
    {
      name: "valorFormatado",
      label: "Valor",
      options: {
        sort: false,
        searchable: false,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.valorFormatado as any),
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
          const o = rows[tableMeta.rowIndex] as OrcRow
          return (
            <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-marromEscuro hover:bg-marromClaro/20"
                    aria-label="Ações"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EllipsisVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={async () => {
                      const link = `https://app.grandesignce.com.br/orcamento/detalhes/${(o as any).id}`
                      try {
                        await navigator.clipboard.writeText(link)
                        toast.success("Link copiado!")
                      } catch {
                        toast.error("Não foi possível copiar o link.")
                      }
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar link de visualização
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link
                      href={`/orcamento/edit/${(o as any).id}`}
                      title="Editar orçamento"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar orçamento
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link
                      href={`/orcamento/detalhes/${(o as any).id}`}
                      title="Visualizar detalhes"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar detalhes
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
      if (action === "changePage") {
        setPage(tableState.page)
      }
      if (action === "changeRowsPerPage") {
        setPerPage(tableState.rowsPerPage)
        setPage(0)
      }
      if (action === "search") {
        const q = tableState.searchText || ""
        setSearchInput(q)
      }
      if (action === "sort") {
        const s = tableState.sortOrder
        if (s && s.name) {
          setOrderBy(s.name as string)
          setOrderDir((s.direction as "asc" | "desc") || undefined)
          setPage(0)
        } else {
          setOrderBy(undefined)
          setOrderDir(undefined)
        }
      }
    },
    sort: true,
    elevation: 0,
    setTableProps: () => ({ style: { borderRadius: 12, overflow: "hidden" } }),
    onRowClick: (_rowData, meta) => {
      const id = (rows[meta.dataIndex] as any)?.id
      if (id != null) router.push(`/orcamento/detalhes/${id}`)
    },
    setRowProps: (_row, dataIndex) => {
      return {
        onMouseDown: (e: any) => {
          const el = e.target as HTMLElement
          if (el.closest("[data-no-row-nav]")) e.stopPropagation()
        },
        className: "cursor-pointer hover:bg-[rgba(232,201,154,0.15)]",
      }
    },
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: MARROM },
          text: { primary: MARROM },
        },
        components: {
          MuiTableHead: { styleOverrides: { root: { backgroundColor: BEGE } } },
          MuiTableRow: {
            styleOverrides: {
              head: {
                backgroundColor: BEGE,
                height: 36,
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: {
                backgroundColor: BEGE,
                color: MARROM,
                fontWeight: 700,
                paddingTop: 6,
                paddingBottom: 6,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              },
              root: {
                color: MARROM,
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              },
            },
          },

          MuiIconButton: {
            styleOverrides: {
              root: { color: MARROM, "&:hover": { backgroundColor: "rgba(232,201,154,0.35)" } },
              colorPrimary: { color: MARROM, "&:hover": { backgroundColor: "rgba(232,201,154,0.35)" } },
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
                "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: "rgba(232,201,154,0.35)" },
              },
            },
          },
          MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
          MuiToolbar: { styleOverrides: { root: { color: MARROM } } },
          MuiTableSortLabel: {
            styleOverrides: {
              root: { color: MARROM + " !important" },
              icon: { color: MARROM + " !important" },
            },
          },
        },
      }),
    []
  )

  return (
    <PageLayout>
      <TooltipProvider>
        <Toaster richColors closeButton />
        <Link href="/orcamento/new" className="block mb-8">
          <BigShinyButton />
        </Link>

        <FilterCard
          value={{
            q: nome,
            telefone,
            bairro,
            cidadeId,
            tipoObraId,
            ini: dataIni ? dataIni.toISOString().slice(0, 10) : undefined,
            fim: dataFim ? dataFim.toISOString().slice(0, 10) : undefined,
            pageSize: perPage as 5 | 10 | 20,
          }}
          onChange={(next: FilterState) => {
            setNome(next.q ?? "")
            setSearchInput(next.q ?? "")
            setTelefone(next.telefone ?? "")
            setBairro(next.bairro ?? "")
            setCidadeId(next.cidadeId ?? null)
            setTipoObraId(next.tipoObraId ?? null)
            setPerPage((next.pageSize as number) ?? perPage)
            setDataIni(next.ini ? new Date(next.ini) : undefined)
            setDataFim(next.fim ? new Date(next.fim) : undefined)
            setPage(0)
          }}
          onClear={() => limparFiltros()}
          availableFields={availableFields as any}
          selectedFields={selectedFields}
          onSelectedFieldsChange={setSelectedFields}
          loading={loadingTabela}
        />

        <Card className="mt-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl text-marromEscuro">Orçamentos</CardTitle>
                <CardDescription className="text-marromClaro">Tabela com os orçamentos dos clientes.</CardDescription>
              </div>
              <Link href="/orcamento/new">
                <InteractiveHoverButton className="px-5 py-2 text-sm font-medium rounded-lg shadow-sm hover:shadow-md">
                  Gerar Novo
                </InteractiveHoverButton>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
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
                    ".MuiTableHead-root, .MuiTableRow-head, .MuiTableCell-head, .MUIDataTableHeadCell-fixedHeader": {
                      backgroundColor: BEGE + " !important",
                      color: MARROM + " !important",
                    },
                    ".MUIDataTableToolbar-icon, .MUIDataTableToolbar-iconActive": {
                      color: MARROM + " !important",
                    },
                    ".MUIDataTableToolbar-icon:hover, .MUIDataTableToolbar-iconActive": {
                      backgroundColor: "rgba(232,201,154,0.35) !important",
                    },
                    ".MUIDataTableToolbar-iconActive .MuiSvgIcon-root": {
                      color: MARROM + " !important",
                    },
                    ".MUIDataTableViewCol-title, .MUIDataTableViewCol-label": {
                      color: MARROM + " !important",
                    },
                    ".MuiTableSortLabel-root:hover .MuiTableSortLabel-icon": {
                      opacity: 1,
                    },
                    ".MuiTableSortLabel-icon": {
                      color: MARROM + " !important",
                    },
                    ".MuiIconButton-root .MuiSvgIcon-root": {
                      color: "inherit !important",
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
