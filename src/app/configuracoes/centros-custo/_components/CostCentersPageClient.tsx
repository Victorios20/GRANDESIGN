"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    Blocks,
    Building2,
    CheckCircle2,
    ExternalLink,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Unplug,
    X,
} from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    operationalListControlClass,
    operationalListGhostButtonClass,
    operationalListPrimaryButtonClass,
    operationalListSearchInputClass,
    operationalListShellClass,
    operationalListTableHeadCellClass,
    operationalListTableHeadClass,
    operationalListTableHeadRowClass,
    operationalListTableRowClass,
} from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"
import type { CentroCustoOption } from "@/types/financeiro"

type Props = {
    initialCostCenters: CentroCustoOption[]
}

type StatusFilter = "all" | "active" | "inactive"
type WorkLinkFilter = "all" | "linked" | "unlinked"

type CostCenterFormState = {
    nome: string
    descricao: string
}

type WorkSearchItem = {
    id: number
    titulo: string | null
    nomeReceptor: string | null
    telefoneReceptor: string | null
    enderecoEntrega: string | null
    linkMaps: string | null
}

const EMPTY_FORM: CostCenterFormState = {
    nome: "",
    descricao: "",
}

function getWorkLabel(costCenter: CentroCustoOption) {
    if (!costCenter.obra_id) {
        return "Sem obra vinculada"
    }

    const title = costCenter.obra?.titulo?.trim()
    return title ? `Obra #${costCenter.obra_id} - ${title}` : `Obra #${costCenter.obra_id}`
}

function getWorkSearchLabel(work: WorkSearchItem | null) {
    if (!work) {
        return "Sem obra selecionada"
    }

    const title = work.titulo?.trim()
    return title ? `Obra #${work.id} - ${title}` : `Obra #${work.id}`
}

function buildWorkSearchItem(costCenter: CentroCustoOption): WorkSearchItem | null {
    if (!costCenter.obra_id) {
        return null
    }

    return {
        id: costCenter.obra_id,
        titulo: costCenter.obra?.titulo ?? null,
        nomeReceptor: null,
        telefoneReceptor: null,
        enderecoEntrega: costCenter.obra?.endereco_obra ?? null,
        linkMaps: null,
    }
}

function getUsageLabel(costCenter: CentroCustoOption) {
    const items = [
        `${costCenter.lancamentosCount ?? 0} lanç.`,
        `${costCenter.contasPagarCount ?? 0} pagar`,
        `${costCenter.contasReceberCount ?? 0} receber`,
    ]

    if ((costCenter.usageCount ?? 0) === 0) {
        return "Sem vínculos"
    }

    return items.join(" • ")
}

function buildFormState(costCenter?: CentroCustoOption | null): CostCenterFormState {
    if (!costCenter) {
        return EMPTY_FORM
    }

    return {
        nome: costCenter.nome,
        descricao: costCenter.descricao ?? "",
    }
}

export default function CostCentersPageClient({ initialCostCenters }: Props) {
    const [costCenters, setCostCenters] = useState(initialCostCenters)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [workLinkFilter, setWorkLinkFilter] = useState<WorkLinkFilter>("all")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [workDialogOpen, setWorkDialogOpen] = useState(false)
    const [statusDialogOpen, setStatusDialogOpen] = useState(false)
    const [editingCostCenter, setEditingCostCenter] = useState<CentroCustoOption | null>(null)
    const [selectedCostCenter, setSelectedCostCenter] = useState<CentroCustoOption | null>(null)
    const [formState, setFormState] = useState<CostCenterFormState>(EMPTY_FORM)
    const [workQuery, setWorkQuery] = useState("")
    const [workResults, setWorkResults] = useState<WorkSearchItem[]>([])
    const [workLoading, setWorkLoading] = useState(false)
    const [selectedWork, setSelectedWork] = useState<WorkSearchItem | null>(null)

    async function refreshCostCenters() {
        try {
            const response = await fetch("/api/financeiro/centros-custo?active=false", {
                cache: "no-store",
            })

            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(payload?.error ?? "Erro ao atualizar centros de custo")
            }

            setCostCenters((await response.json()) as CentroCustoOption[])
        } catch (error) {
            toast.error((error as Error).message)
        }
    }

    function updateForm<K extends keyof CostCenterFormState>(field: K, value: CostCenterFormState[K]) {
        setFormState((current) => ({
            ...current,
            [field]: value,
        }))
    }

    function openCreateDialog() {
        setEditingCostCenter(null)
        setFormState(EMPTY_FORM)
        setSelectedWork(null)
        setWorkResults([])
        setWorkQuery("")
        setFormOpen(true)
    }

    function openEditDialog(costCenter: CentroCustoOption) {
        setEditingCostCenter(costCenter)
        setFormState(buildFormState(costCenter))
        setSelectedWork(buildWorkSearchItem(costCenter))
        setWorkResults([])
        setWorkQuery("")
        setFormOpen(true)
    }

    function openWorkDialog(costCenter: CentroCustoOption) {
        setSelectedCostCenter(costCenter)
        setSelectedWork(buildWorkSearchItem(costCenter))
        setWorkResults([])
        setWorkQuery("")
        setWorkDialogOpen(true)
    }

    function openStatusDialog(costCenter: CentroCustoOption) {
        setSelectedCostCenter(costCenter)
        setStatusDialogOpen(true)
    }

    const visibleCostCenters = useMemo(() => {
        const term = search.trim().toLowerCase()

        return costCenters.filter((costCenter) => {
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && costCenter.ativo) ||
                (statusFilter === "inactive" && !costCenter.ativo)

            const matchesWorkLink =
                workLinkFilter === "all" ||
                (workLinkFilter === "linked" && Boolean(costCenter.obra_id)) ||
                (workLinkFilter === "unlinked" && !costCenter.obra_id)

            if (!matchesStatus || !matchesWorkLink) {
                return false
            }

            if (!term) {
                return true
            }

            return [costCenter.nome, costCenter.descricao ?? "", getWorkLabel(costCenter)].some((value) =>
                value.toLowerCase().includes(term)
            )
        })
    }, [costCenters, search, statusFilter, workLinkFilter])

    const activeFilters = useMemo(() => {
        const chips: Array<{ key: string; label: string; value: string; onRemove: () => void }> = []

        if (search.trim()) {
            chips.push({
                key: "search",
                label: "Busca",
                value: search.trim(),
                onRemove: () => setSearch(""),
            })
        }

        if (statusFilter !== "all") {
            chips.push({
                key: "status",
                label: "Status do centro",
                value: statusFilter === "active" ? "Ativos" : "Inativos",
                onRemove: () => setStatusFilter("all"),
            })
        }

        if (workLinkFilter !== "all") {
            chips.push({
                key: "work-link",
                label: "Centro com obra",
                value: workLinkFilter === "linked" ? "Com obra" : "Sem obra",
                onRemove: () => setWorkLinkFilter("all"),
            })
        }

        return chips
    }, [search, statusFilter, workLinkFilter])

    function clearAllFilters() {
        setSearch("")
        setStatusFilter("all")
        setWorkLinkFilter("all")
    }

    useEffect(() => {
        if (!workDialogOpen && !formOpen) {
            return
        }

        const query = workQuery.trim()
        if (!query) {
            setWorkResults([])
            return
        }

        let cancelled = false
        const timer = setTimeout(async () => {
            try {
                setWorkLoading(true)
                const response = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(query)}`, {
                    cache: "no-store",
                })

                const payload = await response.json().catch(() => null)

                if (!response.ok) {
                    throw new Error(payload?.error ?? "Erro ao pesquisar obras")
                }

                const items: unknown[] = Array.isArray(payload?.data) ? payload.data : []
                const parsed = items
                    .map((item) => {
                        const work = item as Record<string, unknown>

                        return {
                            id: Number(work.id),
                            titulo: work.titulo == null ? null : String(work.titulo),
                            nomeReceptor: work.nomeReceptor == null ? null : String(work.nomeReceptor),
                            telefoneReceptor:
                                work.telefoneReceptor == null ? null : String(work.telefoneReceptor),
                            enderecoEntrega:
                                work.enderecoEntrega == null ? null : String(work.enderecoEntrega),
                            linkMaps: work.linkMaps == null ? null : String(work.linkMaps),
                        }
                    })
                    .filter((item) => Number.isFinite(item.id) && item.id > 0)

                if (!cancelled) {
                    setWorkResults(parsed)
                }
            } catch (error) {
                if (!cancelled) {
                    setWorkResults([])
                    toast.error((error as Error).message)
                }
            } finally {
                if (!cancelled) {
                    setWorkLoading(false)
                }
            }
        }, 300)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [formOpen, workDialogOpen, workQuery])

    async function handleSubmitForm() {
        try {
            setIsSubmitting(true)

            const payload = {
                nome: formState.nome.trim(),
                descricao: formState.descricao.trim() || undefined,
                obra_id: selectedWork?.id ?? null,
                ...(editingCostCenter ? { id: editingCostCenter.id } : {}),
            }

            const response = await fetch("/api/financeiro/centros-custo", {
                method: editingCostCenter ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao salvar centro de custo")
            }

            await refreshCostCenters()
            toast.success(editingCostCenter ? "Centro de custo atualizado" : "Centro de custo criado")
            setFormOpen(false)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleSaveWorkLink() {
        if (!selectedCostCenter) {
            return
        }

        try {
            setIsSubmitting(true)

            const response = await fetch("/api/financeiro/centros-custo", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedCostCenter.id,
                    obra_id: selectedWork?.id ?? null,
                }),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao atualizar vínculo da obra")
            }

            await refreshCostCenters()
            toast.success(selectedWork ? "Obra associada ao centro de custo" : "Vínculo com a obra removido")
            setWorkDialogOpen(false)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleToggleStatus() {
        if (!selectedCostCenter) {
            return
        }

        try {
            setIsSubmitting(true)

            const response = await fetch("/api/financeiro/centros-custo", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedCostCenter.id,
                    ativo: !selectedCostCenter.ativo,
                }),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao atualizar status do centro de custo")
            }

            await refreshCostCenters()
            toast.success(selectedCostCenter.ativo ? "Centro de custo desativado" : "Centro de custo ativado")
            setStatusDialogOpen(false)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-4">
            <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">Centros de Custo</h1>
                    <p className="text-sm text-[#6f6556]">
                        {visibleCostCenters.length} centro{visibleCostCenters.length === 1 ? "" : "s"} na visualização atual
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={openCreateDialog}
                    className={cn(operationalListPrimaryButtonClass, "h-10 rounded-lg px-4 text-sm")}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo centro
                </Button>
            </section>

            <section className={cn(operationalListShellClass, "px-4 py-4 md:px-5")}>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 border-b border-[#eee3ca] pb-3 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-1">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">
                                Filtros da lista
                            </div>
                            <p className="text-xs text-[#8a7d69]">Refine os centros exibidos nesta tabela.</p>
                        </div>

                        {activeFilters.length > 0 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={clearAllFilters}
                                className={cn("self-start px-3 text-sm md:self-auto", operationalListGhostButtonClass)}
                            >
                                <X className="mr-1 size-4" />
                                Limpar filtros
                            </Button>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7d69]" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por nome, descrição ou obra"
                                className={operationalListSearchInputClass}
                            />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-end">
                            <div className="min-w-[170px] space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">
                                    Status do centro
                                </p>
                                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                                    <SelectTrigger className={operationalListControlClass}>
                                        <SelectValue placeholder="Status do centro" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="active">Ativos</SelectItem>
                                        <SelectItem value="inactive">Inativos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[170px] space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">
                                    Centro com obra
                                </p>
                                <Select
                                    value={workLinkFilter}
                                    onValueChange={(value) => setWorkLinkFilter(value as WorkLinkFilter)}
                                >
                                    <SelectTrigger className={operationalListControlClass}>
                                        <SelectValue placeholder="Centro com obra" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="linked">Com obra</SelectItem>
                                        <SelectItem value="unlinked">Sem obra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {activeFilters.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {activeFilters.map((filter) => (
                                <Badge
                                    key={filter.key}
                                    variant="outline"
                                    className="h-6 rounded-md border-[#ddd7cc] bg-[#f6f4ef] px-2 text-[11px] font-medium text-[#5f584c]"
                                >
                                    {filter.label}: {filter.value}
                                    <button
                                        type="button"
                                        onClick={filter.onRemove}
                                        className="ml-1 inline-flex size-4 items-center justify-center rounded-sm text-[#8a7d69] transition-colors hover:bg-black/5 hover:text-[#2c201b]"
                                        aria-label={`Remover filtro ${filter.label}`}
                                    >
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : null}
                </div>
            </section>

            <section className={cn(operationalListShellClass)}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={operationalListTableHeadClass}>
                            <tr className={operationalListTableHeadRowClass}>
                                <th className={operationalListTableHeadCellClass}>Nome</th>
                                <th className={operationalListTableHeadCellClass}>Descrição</th>
                                <th className={operationalListTableHeadCellClass}>Obra associada</th>
                                <th className={operationalListTableHeadCellClass}>Status</th>
                                <th className={operationalListTableHeadCellClass}>Uso no financeiro</th>
                                <th className={cn(operationalListTableHeadCellClass, "text-right")}>Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE8DC]">
                            {visibleCostCenters.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-14 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[#2C201B]/50">
                                            <Blocks className="size-10" />
                                            <div className="space-y-1">
                                                <p className="font-medium text-[#2C201B]">Nenhum centro de custo encontrado</p>
                                                <p className="text-sm">Ajuste os filtros ou crie um novo centro de custo.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                visibleCostCenters.map((costCenter) => (
                                    <tr key={costCenter.id} className={operationalListTableRowClass}>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <p className="font-medium text-[#2C201B]">{costCenter.nome}</p>
                                                <p className="text-xs text-[#2C201B]/52">ID #{costCenter.id}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[#2C201B]/72">
                                            <p className="max-w-[280px] truncate">
                                                {costCenter.descricao?.trim() || "Sem descrição"}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-2">
                                                <p className="text-sm text-[#2C201B]/78">{getWorkLabel(costCenter)}</p>
                                                {costCenter.obra_id ? (
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-[#393316] hover:bg-[#FAF3E0] hover:text-[#2C201B]"
                                                    >
                                                        <Link href={`/obras/${costCenter.obra_id}`}>
                                                            <ExternalLink className="mr-2 size-3.5" />
                                                            Ver obra
                                                        </Link>
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                                    costCenter.ativo
                                                        ? "border-[#393316]/16 bg-[#F2F5E7] text-[#393316]"
                                                        : "border-[#2C201B]/12 bg-[#F5F1E8] text-[#2C201B]/62"
                                                )}
                                            >
                                                {costCenter.ativo ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-[#2C201B]/72">{getUsageLabel(costCenter)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-[#2C201B]/62 hover:bg-[#FAF3E0] hover:text-[#2C201B]"
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                        <span className="sr-only">Abrir ações</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuItem onClick={() => openEditDialog(costCenter)}>
                                                        <Pencil className="mr-2 size-4" />
                                                        Editar centro
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openWorkDialog(costCenter)}>
                                                        <Building2 className="mr-2 size-4" />
                                                        {costCenter.obra_id ? "Trocar obra" : "Vincular obra"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openStatusDialog(costCenter)}>
                                                        {costCenter.ativo ? (
                                                            <Unplug className="mr-2 size-4" />
                                                        ) : (
                                                            <CheckCircle2 className="mr-2 size-4" />
                                                        )}
                                                        {costCenter.ativo ? "Desativar centro" : "Ativar centro"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="border-[#2C201B]/10 bg-[#FFFCF7] sm:max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle>{editingCostCenter ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
                        <DialogDescription>
                            {editingCostCenter
                                ? "Atualize os dados e o vínculo com obra usado em pedidos, contas e relatórios financeiros."
                                : "Crie um centro de custo e, se aplicável, vincule uma obra para alimentar o financeiro automaticamente."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="cost-center-name">Nome</Label>
                            <Input
                                id="cost-center-name"
                                value={formState.nome}
                                onChange={(event) => updateForm("nome", event.target.value)}
                                placeholder="Ex.: Obra Alto Padrão - Principal"
                                className="border-[#2C201B]/10 bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cost-center-description">Descrição</Label>
                            <Textarea
                                id="cost-center-description"
                                value={formState.descricao}
                                onChange={(event) => updateForm("descricao", event.target.value)}
                                placeholder="Contexto adicional para identificação interna."
                                className="min-h-28 border-[#2C201B]/10 bg-white"
                            />
                        </div>

                        <div className="space-y-3 rounded-2xl border border-[#2C201B]/8 bg-white p-4">
                            <div className="space-y-1">
                                <Label htmlFor="cost-center-work-search">Obra vinculada</Label>
                                <p className="text-xs text-[#2C201B]/58">
                                    O vínculo conecta pedidos de compra, contas, lançamentos e relatórios financeiros à obra.
                                </p>
                            </div>

                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2C201B]/35" />
                                <Input
                                    id="cost-center-work-search"
                                    value={workQuery}
                                    onChange={(event) => setWorkQuery(event.target.value)}
                                    placeholder="Pesquisar obra por ID, título, cliente ou endereço"
                                    className="border-[#2C201B]/10 bg-[#FFFCF7] pl-9"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1 rounded-2xl border border-[#F5D193]/55 bg-[#FAF3E0] px-4 py-3 text-sm text-[#2C201B]/78">
                                    <p className="font-medium text-[#2C201B]">{getWorkSearchLabel(selectedWork)}</p>
                                    {selectedWork?.enderecoEntrega ? (
                                        <p className="mt-1 line-clamp-2">{selectedWork.enderecoEntrega}</p>
                                    ) : null}
                                </div>
                                {selectedWork ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedWork(null)}
                                        className="shrink-0 px-2 text-[#2C201B]/62 hover:bg-[#FAF3E0] hover:text-[#2C201B]"
                                    >
                                        Remover
                                    </Button>
                                ) : null}
                            </div>

                            <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-[#2C201B]/8 bg-[#FFFCF7] p-2">
                                {workLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#2C201B]/55">
                                        <Loader2 className="size-4 animate-spin" />
                                        Buscando obras...
                                    </div>
                                ) : workQuery.trim().length === 0 ? (
                                    <div className="py-6 text-center text-sm text-[#2C201B]/55">
                                        Digite para pesquisar e vincular uma obra.
                                    </div>
                                ) : workResults.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-[#2C201B]/55">
                                        Nenhuma obra encontrada para essa busca.
                                    </div>
                                ) : (
                                    workResults.map((work) => {
                                        const isSelected = selectedWork?.id === work.id

                                        return (
                                            <button
                                                key={work.id}
                                                type="button"
                                                onClick={() => setSelectedWork(work)}
                                                className={cn(
                                                    "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                                                    isSelected
                                                        ? "border-[#393316]/18 bg-[#F2F5E7]"
                                                        : "border-[#2C201B]/8 bg-white hover:bg-[#FAF3E0]/45"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="font-medium text-[#2C201B]">{getWorkSearchLabel(work)}</p>
                                                        {work.nomeReceptor ? (
                                                            <p className="text-sm text-[#2C201B]/62">Cliente: {work.nomeReceptor}</p>
                                                        ) : null}
                                                        {work.enderecoEntrega ? (
                                                            <p className="text-sm text-[#2C201B]/56">{work.enderecoEntrega}</p>
                                                        ) : null}
                                                    </div>
                                                    {isSelected ? (
                                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#393316]" />
                                                    ) : null}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmitForm}
                            disabled={isSubmitting || !formState.nome.trim()}
                            className={cn(operationalListPrimaryButtonClass, "h-10 px-4")}
                        >
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            {editingCostCenter ? "Salvar alterações" : "Criar centro"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={workDialogOpen} onOpenChange={setWorkDialogOpen}>
                <DialogContent className="border-[#2C201B]/10 bg-[#FFFCF7] sm:max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle>Vincular Obra</DialogTitle>
                        <DialogDescription>
                            Associe uma obra ao centro de custo. O sistema permite apenas um centro principal ativo por obra.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="rounded-2xl border border-[#2C201B]/8 bg-white p-4">
                            <p className="text-sm font-medium text-[#2C201B]">{selectedCostCenter?.nome ?? "Centro de custo"}</p>
                            <p className="mt-1 text-sm text-[#2C201B]/62">
                                {selectedCostCenter ? getWorkLabel(selectedCostCenter) : "Sem obra vinculada"}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="work-search">Buscar obra</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2C201B]/35" />
                                <Input
                                    id="work-search"
                                    value={workQuery}
                                    onChange={(event) => setWorkQuery(event.target.value)}
                                    placeholder="Pesquisar por título, cliente ou endereço"
                                    className="border-[#2C201B]/10 bg-white pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label>Obra selecionada</Label>
                                {selectedWork ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedWork(null)}
                                        className="h-8 px-2 text-[#2C201B]/62 hover:bg-[#FAF3E0] hover:text-[#2C201B]"
                                    >
                                        Remover seleção
                                    </Button>
                                ) : null}
                            </div>
                            <div className="rounded-2xl border border-[#F5D193]/55 bg-[#FAF3E0] p-4 text-sm text-[#2C201B]/78">
                                <p className="font-medium text-[#2C201B]">{getWorkSearchLabel(selectedWork)}</p>
                                {selectedWork?.enderecoEntrega ? (
                                    <p className="mt-1 line-clamp-2">{selectedWork.enderecoEntrega}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Resultados</Label>
                            <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-[#2C201B]/8 bg-white p-2">
                                {workLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#2C201B]/55">
                                        <Loader2 className="size-4 animate-spin" />
                                        Buscando obras...
                                    </div>
                                ) : workQuery.trim().length === 0 ? (
                                    <div className="py-8 text-center text-sm text-[#2C201B]/55">
                                        Digite para pesquisar obras.
                                    </div>
                                ) : workResults.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-[#2C201B]/55">
                                        Nenhuma obra encontrada para essa busca.
                                    </div>
                                ) : (
                                    workResults.map((work) => {
                                        const isSelected = selectedWork?.id === work.id

                                        return (
                                            <button
                                                key={work.id}
                                                type="button"
                                                onClick={() => setSelectedWork(work)}
                                                className={cn(
                                                    "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                                                    isSelected
                                                        ? "border-[#393316]/18 bg-[#F2F5E7]"
                                                        : "border-[#2C201B]/8 bg-[#FFFCF7] hover:bg-[#FAF3E0]/45"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="font-medium text-[#2C201B]">{getWorkSearchLabel(work)}</p>
                                                        {work.nomeReceptor ? (
                                                            <p className="text-sm text-[#2C201B]/62">Cliente: {work.nomeReceptor}</p>
                                                        ) : null}
                                                        {work.enderecoEntrega ? (
                                                            <p className="text-sm text-[#2C201B]/56">{work.enderecoEntrega}</p>
                                                        ) : null}
                                                    </div>
                                                    {isSelected ? (
                                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#393316]" />
                                                    ) : null}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setWorkDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveWorkLink}
                            disabled={isSubmitting}
                            className={cn(operationalListPrimaryButtonClass, "h-10 px-4")}
                        >
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            Salvar vínculo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent className="border-[#2C201B]/10 bg-[#FFFCF7]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {selectedCostCenter?.ativo ? "Desativar centro de custo?" : "Ativar centro de custo?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedCostCenter?.ativo
                                ? "O centro deixará de aparecer nas novas seleções operacionais, mas todo o histórico financeiro será preservado."
                                : "O centro voltará a ficar disponível para uso nas operações financeiras."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleStatus} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            {selectedCostCenter?.ativo ? "Desativar" : "Ativar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
