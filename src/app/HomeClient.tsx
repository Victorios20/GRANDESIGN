// app/HomeClient.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { EllipsisVertical, Eye, Pencil, Copy, Hammer, Trash2, CheckCircle2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { toast } from "sonner"
import FilterCard from "../components/modals/FilterCard"
import type { Option } from "../components/modals/FilterCard"
import { listarBairros } from "./_actions/home.actions"
import type { OrcamentoTabela } from "./_actions/home.actions"

import MUIDataTable, { MUIDataTableColumnDef, MUIDataTableOptions } from "mui-datatables"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { GlobalStyles } from "@mui/material"
import ExcluirModalOrcamento from "@/components/modals/ExcluirModalOrcamento"

type OrcRow = OrcamentoTabela & {
  cidade?: string
  tipoObra?: string
  data_ultima_alteracao?: string
  clienteTelefone?: string
  lancadoObra?: boolean
  lancadoObraEmISO?: string | null
  obraId?: number | null
  excluido?: boolean
}

type InitialData = {
  listaBairros: string[]
  dados: OrcamentoTabela[]
  total: number
}

const BEGE = "#E8C99A"
const MARROM = "#8B5E3C"

type StatusExcluido = "ativos" | "excluidos" | "todos"

export default function HomeClient({ initial }: { initial: InitialData }) {
  const router = useRouter()

  const [nome, setNome] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [bairro, setBairro] = useState<string>("")
  const [dataIni, setDataIni] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [telefone, setTelefone] = useState("")
  const [tipoObraId, setTipoObraId] = useState<number | null>(null)
  const [statusExcluido, setStatusExcluido] = useState<StatusExcluido>("ativos")

  const [tiposOpts, setTiposOpts] = useState<Option[]>([])

  const [orcamentos, setOrcamentos] = useState<OrcRow[]>(
    (initial.dados ?? []).map((o, i) => ({
      id: (o as any).id ?? i,
      ...(o as any),
      lancadoObra: Boolean((o as any).lancado_obra ?? (o as any).lancadoObra ?? false),
      lancadoObraEmISO: (o as any).lancado_obra_em ?? (o as any).lancadoObraEmISO ?? null,
      obraId:
        (o as any).obraId != null
          ? Number((o as any).obraId)
          : (o as any).obra_id != null
          ? Number((o as any).obra_id)
          : null,
      excluido: Boolean((o as any).excluido ?? false),
    }))
  )

  const [total, setTotal] = useState<number>(initial.total ?? 0)
  const [loadingTabela, setLoadingTabela] = useState(false)

  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(20)

  const [modalOpen, setModalOpen] = useState(false)
  const [orcamentoAlvo, setOrcamentoAlvo] = useState<OrcRow | null>(null)

  useEffect(() => {
    if (nome.trim() && page !== 0) setPage(0)
  }, [nome, page])

  useEffect(() => {
    listarBairros().catch(() => {})

    ;(async () => {
      try {
        const rt = await fetch(`/api/tipos-obra?page=1&pageSize=100`).then((r) => r.json())
        const arr = rt?.options ?? rt?.data ?? rt?.items ?? rt ?? []
        const list: Option[] = Array.isArray(arr)
          ? arr
              .map((x: any) => {
                const id = Number(x?.id)
                if (!Number.isFinite(id)) return null
                const label =
                  (typeof x?.tipo_obra === "string" && x.tipo_obra) ||
                  (typeof x?.nome === "string" && x.nome) ||
                  (typeof x?.descricao === "string" && x.descricao) ||
                  ""
                const lab = String(label).trim()
                if (!lab) return null
                return { id, label: lab }
              })
              .filter(Boolean) as Option[]
          : []
        setTiposOpts(list)
      } catch {}
    })()

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
  }, [nome, bairro, telefone, tipoObraId, dataIni, dataFim, page, perPage, statusExcluido])

  useEffect(() => {
    if (modalOpen) return
    requestAnimationFrame(() => {
      if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = ""
      if (document.body.style.overflow === "hidden") document.body.style.overflow = ""
    })
  }, [modalOpen])

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
    if (tipoObraId != null) qs.set("tipoObraId", String(tipoObraId))
    if (dIniISO) qs.set("dIni", dIniISO)
    if (dFimISO) qs.set("dFim", dFimISO)
    qs.set("statusExcluido", statusExcluido)

    const res = await fetch(`/api/Orcamentos/table-search?${qs.toString()}`, { cache: "no-store" })
    if (!res.ok) {
      setOrcamentos([])
      setTotal(0)
      setLoadingTabela(false)
      return
    }

    const json = await res.json()
    const dadosRaw = (json.dados ?? []) as any[]
    const mapped: OrcRow[] = dadosRaw.map((o, i) => ({
      id: o?.id ?? i,
      ...o,
      lancadoObra: Boolean(o?.lancado_obra ?? o?.lancadoObra ?? false),
      lancadoObraEmISO: o?.lancado_obra_em ?? o?.lancadoObraEmISO ?? null,
      obraId: o?.obraId != null ? Number(o.obraId) : o?.obra_id != null ? Number(o.obra_id) : null,
      excluido: Boolean(o?.excluido ?? false),
    }))

    setOrcamentos(mapped)
    setTotal(Number(json.total ?? 0))
    setLoadingTabela(false)
  }

  function limparFiltros() {
    setNome("")
    setSearchInput("")
    setBairro("")
    setTelefone("")
    setTipoObraId(null)
    setDataIni(undefined)
    setDataFim(undefined)
    setStatusExcluido("ativos")
    setPage(0)
  }

  const safeCell = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : v)

  const strDate = (s?: string) => {
    if (!s) return "-"
    const naive = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (naive) {
      const [, Y, M, D, hh, mm] = naive
      return `${D}/${M}/${Y} ${hh}:${mm}`
    }
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
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

  const rows: OrcRow[] = useMemo(
    () =>
      (orcamentos ?? []).map((o, i) =>
        (o as any).id != null ? (o as OrcRow) : ({ id: i, ...(o as any) } as OrcRow)
      ),
    [orcamentos]
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
      name: "obra",
      label: "",
      options: {
        sort: false,
        searchable: false,
        filter: false,
        setCellHeaderProps: () => ({ style: { width: 44, paddingLeft: 8, paddingRight: 8 } }),
        setCellProps: () => ({ style: { textAlign: "center" } }),
        customBodyRender: (_val, meta) => {
          const r = rows[meta.rowIndex]
          if (!r?.lancadoObra) return null
          return <Hammer className="h-4 w-4 text-marromEscuro" aria-label="Obra lançada" />
        },
      },
    },
    { name: "titulo", label: "Título", options: { sort: false, searchable: true } },
    { name: "cliente", label: "Cliente", options: { sort: false, searchable: true } },
    {
      name: "bairro",
      label: "Bairro",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.bairro),
      },
    },
    {
      name: "cidade",
      label: "Cidade",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.cidade),
      },
    },
    {
      name: "tipoObra",
      label: "Tipo de obra",
      options: {
        sort: false,
        searchable: true,
        customBodyRender: (_val, meta) => safeCell(rows[meta.rowIndex]?.tipoObra),
      },
    },
    {
      name: "situacao",
      label: "Situação",
      options: {
        sort: false,
        searchable: false,
        customBodyRender: (_val, meta) => {
          const r = rows[meta.rowIndex]
          const isExcluido = !!r?.excluido
          return (
            <span className={isExcluido ? "text-red-700 font-medium" : "text-emerald-700 font-medium"}>
              {isExcluido ? "Excluído" : "Ativo"}
            </span>
          )
        },
      },
    },
    {
      name: "data_ultima_alteracao",
      label: "Data da Atualização",
      options: {
        sort: false,
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
          const isLancado = !!o.lancadoObra
          const isExcluido = !!o.excluido

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
                  className="w-64"
                  data-no-row-nav
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={async () => {
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

                  <DropdownMenuItem asChild className="cursor-pointer" data-no-row-nav>
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

                  <DropdownMenuItem asChild className="cursor-pointer" data-no-row-nav>
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

                  {!isLancado ? (
                    <DropdownMenuItem asChild className="cursor-pointer" data-no-row-nav>
                      <Link
                        href={`/obras/new/${(o as any).id}`}
                        title="Lançar obra"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Hammer className="mr-2 h-4 w-4" />
                        Lançar obra
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      asChild
                      className={`cursor-pointer ${o.obraId == null ? "opacity-60 pointer-events-none" : ""}`}
                      data-no-row-nav
                    >
                      <Link
                        href={o.obraId != null ? `/obras/${o.obraId}` : "#"}
                        title="Visualizar obra"
                        target={o.obraId != null ? "_blank" : undefined}
                        rel={o.obraId != null ? "noopener noreferrer" : undefined}
                      >
                        <Hammer className="mr-2 h-4 w-4" />
                        Visualizar obra
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    className={`cursor-pointer ${isExcluido ? "text-emerald-700" : "text-red-700"}`}
                    onSelect={() => {
                      setOrcamentoAlvo(o)
                      setModalOpen(true)
                    }}
                    data-no-row-nav
                  >
                    {isExcluido ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Reativar orçamento
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir orçamento
                      </>
                    )}
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
    onRowClick: (rowData) => {
      const id = Array.isArray(rowData) ? rowData[0] : null
      if (id != null) router.push(`/orcamento/detalhes/${id}`)
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
                color: MARROM,
              },
            },
          },
          MuiTableHead: { styleOverrides: { root: { backgroundColor: BEGE } } },
          MuiTableRow: { styleOverrides: { head: { backgroundColor: BEGE, height: 36 } } },
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
                paddingTop: 6,
                paddingBottom: 6,
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: { color: MARROM, "&:hover": { backgroundColor: "rgba(232,201,154,0.35)" } },
              colorPrimary: {
                color: MARROM,
                "&:hover": { backgroundColor: "rgba(232,201,154,0.35)" },
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
      <Link href="/orcamento/new">
        <InteractiveHoverButton className="px-4 py-1.5 text-sm rounded-lg shadow-sm hover:shadow-md">
          Gerar Novo
        </InteractiveHoverButton>
      </Link>
    </div>
  )

  return (
    <PageLayout headerActions={headerActions} isTitulo>
      <TooltipProvider>
        <Card ultraCompact>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <CardTitle className="text-2xl leading-tight text-marromEscuro">Orçamentos</CardTitle>
                <CardDescription className="text-[13px] leading-tight text-marromClaro">
                  Tabela com os orçamentos dos clientes.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <FilterCard
                  value={
                    {
                      q: nome,
                      telefone,
                      bairro,
                      tipoObraId,
                      ini: dataIni ? dataIni.toISOString().slice(0, 10) : undefined,
                      fim: dataFim ? dataFim.toISOString().slice(0, 10) : undefined,
                      pageSize: perPage as any,
                      statusExcluido,
                    } as any
                  }
                  onChange={(next) => {
                    const v = next as any
                    setNome(v.q ?? "")
                    setSearchInput(v.q ?? "")
                    setTelefone(v.telefone ?? "")
                    setBairro(v.bairro ?? "")
                    setTipoObraId(v.tipoObraId ?? null)
                    if (v.pageSize) setPerPage(Number(v.pageSize))
                    setDataIni(v.ini ? new Date(v.ini) : undefined)
                    setDataFim(v.fim ? new Date(v.fim) : undefined)
                    if (v.statusExcluido === "excluidos" || v.statusExcluido === "todos") {
                      setStatusExcluido(v.statusExcluido)
                    } else {
                      setStatusExcluido("ativos")
                    }
                    setPage(0)
                  }}
                  onApply={() => consultar()}
                  onClear={() => {
                    limparFiltros()
                    consultar()
                  }}
                  tipoObraOptions={tiposOpts}
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
                    ".MUIDataTableHeadCell-fixedHeader, .MuiTableHead-root, .MuiTableRow-head, .MuiTableCell-head": {
                      backgroundColor: BEGE + " !important",
                      color: MARROM + " !important",
                    },
                    ".MUIDataTableToolbar-icon, .MUIDataTableToolbar-iconActive": {
                      color: MARROM + " !important",
                    },
                    ".MUIDataTableToolbar-icon:hover, .MUIDataTableToolbar-iconActive": {
                      backgroundColor: "rgba(232,201,154,0.35) !important",
                    },
                  }}
                />
                <MUIDataTable title={""} data={rows as any} columns={columns} options={options} />
              </ThemeProvider>
            )}
          </CardContent>
        </Card>

        {modalOpen ? (
          <ExcluirModalOrcamento
            open={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setOrcamentoAlvo(null)
            }}
            orcamentoId={orcamentoAlvo?.id ?? null}
            isExcluido={!!orcamentoAlvo?.excluido}
            onFinished={() => {
              consultar()
            }}
          />
        ) : null}
      </TooltipProvider>
    </PageLayout>
  )
}
