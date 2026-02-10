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

import { EllipsisVertical, Edit, Users, Receipt, HardHat, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import FilterCardClientes, { FilterStateClientes } from "@/components/clientes/FilterCardClientes"

import MUIDataTable, { MUIDataTableColumnDef, MUIDataTableOptions } from "mui-datatables"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { GlobalStyles } from "@mui/material"

// Local types matching API response
type ClienteRow = {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
    cidade_id: number | null
    cidade_nome: string | null
    cpf: string | null
    _count: {
        obras: number
        orcamentos: number
    }
}

type InitialData = {
    listaCidades: { id: number; nome: string }[]
    dados: ClienteRow[]
    total: number
}

const BEGE = "#E8C99A"
const MARROM = "#8B5E3C"
const VERDE_HEADER = "#376139"
const CINZA_TEXTO = "#737373"

export default function ClientesClient({ initial }: { initial: InitialData }) {
    const router = useRouter()

    // State for filters
    const [nome, setNome] = useState("")
    const [searchDraft, setSearchDraft] = useState("")
    const [telefone, setTelefone] = useState("")
    const [bairro, setBairro] = useState("")
    const [cidadeId, setCidadeId] = useState<string | undefined>()
    const [temObras, setTemObras] = useState(false)
    const [temOrcamentos, setTemOrcamentos] = useState(false)

    // Data state
    const [clientes, setClientes] = useState<ClienteRow[]>(initial.dados || [])
    const [total, setTotal] = useState<number>(initial.total || 0)
    const [loadingTabela, setLoadingTabela] = useState(false)

    // Pagination
    const [page, setPage] = useState(0)
    const [perPage, setPerPage] = useState(20)

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            setNome(searchDraft)
            setPage(0)
        }, 450)
        return () => clearTimeout(t)
    }, [searchDraft])

    // Fetch data on change
    useEffect(() => {
        consultar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nome, telefone, bairro, cidadeId, temObras, temOrcamentos, page, perPage])

    async function consultar() {
        setLoadingTabela(true)

        const qs = new URLSearchParams()
        qs.set("page", String(page + 1))
        qs.set("perPage", String(perPage))
        if (nome) qs.set("search", nome)
        if (telefone) qs.set("telefone", telefone)
        if (bairro) qs.set("bairro", bairro)
        if (cidadeId) qs.set("cidadeId", cidadeId)
        if (temObras) qs.set("temObras", "true")
        if (temOrcamentos) qs.set("temOrcamentos", "true")

        try {
            const res = await fetch(`/api/clientes?${qs.toString()}`, { cache: "no-store" })
            if (!res.ok) throw new Error("Falha ao buscar")
            const json = await res.json()
            setClientes(json.dados || [])
            setTotal(json.total || 0)
        } catch (err) {
            console.error(err)
            setClientes([])
            setTotal(0)
        } finally {
            setLoadingTabela(false)
        }
    }

    function limparFiltros() {
        setNome("")
        setSearchDraft("")
        setTelefone("")
        setBairro("")
        setCidadeId(undefined)
        setTemObras(false)
        setTemOrcamentos(false)
        setPage(0)
    }

    const safeCell = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : v)

    // Table Columns
    const columns: MUIDataTableColumnDef[] = [
        {
            name: "id",
            label: "ID",
            options: {
                display: "excluded",
                filter: false,
                sort: false,
            },
        },
        {
            name: "nome",
            label: "Nome",
            options: {
                sort: false,
                filter: false,
                customBodyRender: (val, meta) => (
                    <div className="font-semibold text-gray-900">{safeCell(val)}</div>
                ),
            },
        },
        {
            name: "telefone",
            label: "Telefone",
            options: {
                sort: false,
                filter: false,
                customBodyRender: (val) => safeCell(val),
            },
        },
        {
            name: "bairro",
            label: "Bairro",
            options: {
                sort: false,
                filter: false,
                customBodyRender: (val) => safeCell(val),
            },
        },
        {
            name: "cidade_nome",
            label: "Cidade",
            options: {
                sort: false,
                filter: false,
                customBodyRender: (val) => safeCell(val),
            },
        },
        {
            name: "_count",
            label: "Orçamentos",
            options: {
                sort: false,
                filter: false,
                customBodyRender: (val: any) => (
                    <div className="flex items-center gap-1">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <span>{val?.orcamentos ?? 0}</span>
                    </div>
                ),
            },
        },
        {
            name: "_count",
            label: "Obras",
            options: {
                sort: false,
                filter: false,
                customBodyRender: (val: any) => (
                    <div className="flex items-center gap-1">
                        <HardHat className="w-4 h-4 text-muted-foreground" />
                        <span>{val?.obras ?? 0}</span>
                    </div>
                ),
            },
        },
        {
            name: "acoes",
            label: "Ações",
            options: {
                sort: false,
                filter: false,
                customBodyRender: (_val, tableMeta) => {
                    const rowData = clientes[tableMeta.rowIndex]
                    return (
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                                        <EllipsisVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href={`/clientes/${rowData.id}`}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Editar / Detalhes
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
        download: false,
        viewColumns: true,
        selectableRows: "multiple",
        customToolbarSelect: (selectedRows, displayData, setSelectedRows) => (
            <CustomToolbarSelect
                selectedRows={selectedRows}
                displayData={displayData}
                setSelectedRows={setSelectedRows}
                clientes={clientes}
                onRefresh={consultar}
            />
        ),
        serverSide: true,
        count: total,
        page,
        rowsPerPage: perPage,
        rowsPerPageOptions: [10, 20, 50, 100],
        onTableChange: (action, tableState) => {
            if (action === "changePage") setPage(tableState.page)
            if (action === "changeRowsPerPage") {
                setPerPage(tableState.rowsPerPage)
                setPage(0)
            }
            if (action === "search") {
                setSearchDraft(tableState.searchText || "")
            }
        },
        sort: false,
        elevation: 0,
        setTableProps: () => ({ style: { borderRadius: 12, overflow: "hidden" } }),
        onRowClick: (_rowData, rowMeta) => {
            const id = clientes[rowMeta.dataIndex]?.id
            if (id) router.push(`/clientes/${id}`)
        },
        setRowProps: () => ({
            className: "cursor-pointer hover:bg-accent/10 transition-colors",
        }),
        textLabels: {
            body: {
                noMatch: loadingTabela ? "Carregando..." : "Nenhum cliente encontrado",
            },
            selectedRows: {
                text: "cliente(s) selecionado(s)",
                delete: "Excluir",
                deleteAria: "Excluir Clientes Selecionados",
            },
        },
    }

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    primary: { main: MARROM },
                },
                components: {
                    MuiPaper: { styleOverrides: { root: { boxShadow: "none", border: "1px solid #e5e7eb" } } },
                    MuiToolbar: { styleOverrides: { root: { minHeight: "48px" } } },
                    MuiTableHead: { styleOverrides: { root: { backgroundColor: VERDE_HEADER } } },
                    MuiTableCell: {
                        styleOverrides: {
                            head: {
                                backgroundColor: VERDE_HEADER,
                                color: "#f4f4f4",
                                fontWeight: 600,
                            },
                        },
                    },
                },
            }),
        []
    )

    const headerActions = (
        <Link href="/clientes/novo">
            <InteractiveHoverButton>Novo Cliente</InteractiveHoverButton>
        </Link>
    )

    const filterValue: FilterStateClientes = {
        q: searchDraft,
        telefone,
        bairro,
        cidadeId,
        temObras,
        temOrcamentos,
        pageSize: perPage as any,
    }

    return (
        <PageLayout headerActions={headerActions} isTitulo>
            <TooltipProvider>
                <Card className="border-none shadow-none bg-transparent">
                    <CardHeader className="px-0 pt-0 pb-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                                    <Users className="h-6 w-6" />
                                    Clientes
                                </CardTitle>
                                <CardDescription>
                                    Gerencie sua base de clientes, visualize obras e orçamentos vinculados.
                                </CardDescription>
                            </div>

                            <FilterCardClientes
                                value={filterValue}
                                onChange={(next) => {
                                    setSearchDraft(next.q ?? "")
                                    setTelefone(next.telefone ?? "")
                                    setBairro(next.bairro ?? "")
                                    setCidadeId(next.cidadeId)
                                    setTemObras(!!next.temObras)
                                    setTemOrcamentos(!!next.temOrcamentos)
                                    if (next.pageSize) setPerPage(next.pageSize)
                                    setPage(0)
                                }}
                                onApply={consultar}
                                onClear={limparFiltros}
                                loading={loadingTabela}
                                listaCidades={initial.listaCidades}
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="px-0">
                        {loadingTabela && clientes.length === 0 ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <ThemeProvider theme={theme}>
                                <GlobalStyles
                                    styles={{
                                        ".MUIDataTableHeadCell-fixedHeader": {
                                            backgroundColor: `${VERDE_HEADER} !important`,
                                        },
                                    }}
                                />
                                <MUIDataTable
                                    title=""
                                    data={clientes}
                                    columns={columns}
                                    options={options}
                                />
                            </ThemeProvider>
                        )}
                    </CardContent>
                </Card>
            </TooltipProvider>
        </PageLayout>
    )
}

const CustomToolbarSelect = ({
    selectedRows,
    displayData,
    setSelectedRows,
    clientes,
    onRefresh,
}: {
    selectedRows: any
    displayData: any
    setSelectedRows: (rows: any) => void
    clientes: ClienteRow[]
    onRefresh: () => void
}) => {
    const [open, setOpen] = useState(false)
    const [processing, setProcessing] = useState(false)

    async function handleMassDelete() {
        setProcessing(true)
        try {
            // Map selected indices to client IDs
            const selectedIndices = selectedRows.data.map((d: any) => d.dataIndex)
            const idsToDelete = selectedIndices.map((idx: number) => clientes[idx].id)

            if (idsToDelete.length === 0) return

            const { deleteClientesMass } = await import("@/actions/clientes-db/clientes-db")
            const res = await deleteClientesMass(idsToDelete)

            if (res.errors === 0 && res.blocked === 0) {
                toast.success(`${res.deleted} cliente(s) excluído(s) com sucesso!`)
            } else {
                toast.warning(
                    `Operação concluída: ${res.deleted} excluídos, ${res.blocked} bloqueados (vínculos), ${res.errors} erros.`
                )
            }
            setSelectedRows([])
            onRefresh()
        } catch (err) {
            console.error(err)
            toast.error("Erro ao processar exclusão em massa.")
        } finally {
            setProcessing(false)
            setOpen(false)
        }
    }

    return (
        <div className="mr-6">
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Excluir Selecionados
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Clientes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a excluir {selectedRows.data.length} cliente(s).
                            Clientes com obras ou orçamentos vinculados não serão excluídos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault() // Prevent auto-close to handle async
                                handleMassDelete()
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Exclusão"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
