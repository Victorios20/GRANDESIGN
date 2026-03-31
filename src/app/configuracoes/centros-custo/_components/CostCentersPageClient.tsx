"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
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
    Target,
    Unplug,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
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

type SummaryCardProps = {
    label: string
    value: string
    icon: ComponentType<{ className?: string }>
}

const EMPTY_FORM: CostCenterFormState = {
    nome: "",
    descricao: "",
}

function SummaryCard({ label, value, icon: Icon }: SummaryCardProps) {
    return (
        <Card className="border border-[rgba(44,32,27,0.08)] bg-[#FFFCF7]">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/45">
                            {label}
                        </p>
                        <p className="text-lg font-semibold text-[#2C201B]">{value}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2C201B]/8 bg-[#FAF3E0]">
                        <Icon className="size-5 text-[#393316]" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function getWorkLabel(costCenter: CentroCustoOption) {
    if (!costCenter.obra_id) {
        return "Sem obra vinculada"
    }

    const title = costCenter.obra?.titulo?.trim()
    return title ? `Obra #${costCenter.obra_id} — ${title}` : `Obra #${costCenter.obra_id}`
}

function getWorkSearchLabel(work: WorkSearchItem | null) {
    if (!work) {
        return "Sem obra selecionada"
    }

    const title = work.titulo?.trim()
    return title ? `Obra #${work.id} — ${title}` : `Obra #${work.id}`
}

function getUsageLabel(costCenter: CentroCustoOption) {
    const counts = [
        `${costCenter.lancamentosCount ?? 0} lanç.`,
        `${costCenter.contasPagarCount ?? 0} pagar`,
        `${costCenter.contasReceberCount ?? 0} receber`,
    ]

    if ((costCenter.usageCount ?? 0) === 0) {
        return "Sem vínculos"
    }

    return counts.join(" • ")
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
    const [isFetching, setIsFetching] = useState(false)
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
            setIsFetching(true)
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
        } finally {
            setIsFetching(false)
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
        setFormOpen(true)
    }

    function openEditDialog(costCenter: CentroCustoOption) {
        setEditingCostCenter(costCenter)
        setFormState(buildFormState(costCenter))
        setFormOpen(true)
    }

    function openWorkDialog(costCenter: CentroCustoOption) {
        setSelectedCostCenter(costCenter)
        setSelectedWork(
            costCenter.obra_id
                ? {
                    id: costCenter.obra_id,
                    titulo: costCenter.obra?.titulo ?? null,
                    nomeReceptor: null,
                    telefoneReceptor: null,
                    enderecoEntrega: costCenter.obra?.endereco_obra ?? null,
                    linkMaps: null,
                }
                : null
        )
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

            return [
                costCenter.nome,
                costCenter.descricao ?? "",
                getWorkLabel(costCenter),
            ].some((value) => value.toLowerCase().includes(term))
        })
    }, [costCenters, search, statusFilter, workLinkFilter])

    const summary = useMemo(() => {
        return visibleCostCenters.reduce(
            (accumulator, costCenter) => {
                accumulator.total += 1
                accumulator.active += costCenter.ativo ? 1 : 0
                accumulator.linked += costCenter.obra_id ? 1 : 0
                accumulator.unlinked += costCenter.obra_id ? 0 : 1
                return accumulator
            },
            {
                total: 0,
                active: 0,
                linked: 0,
                unlinked: 0,
            }
        )
    }, [visibleCostCenters])

    useEffect(() => {
        if (!workDialogOpen) {
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
                            nomeReceptor:
                                work.nomeReceptor == null ? null : String(work.nomeReceptor),
                            telefoneReceptor:
                                work.telefoneReceptor == null
                                    ? null
                                    : String(work.telefoneReceptor),
                            enderecoEntrega:
                                work.enderecoEntrega == null
                                    ? null
                                    : String(work.enderecoEntrega),
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
    }, [workDialogOpen, workQuery])

    async function handleSubmitForm() {
        try {
            setIsSubmitting(true)

            const payload = {
                nome: formState.nome.trim(),
                descricao: formState.descricao.trim() || undefined,
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
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#2C201B]/10 bg-[#FFFCF7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2C201B]/52">
                        <Blocks className="size-3.5" />
                        Configuracoes Financeiras
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#2C201B]">
                            Centros de Custo
                        </h1>
                        <p className="mt-1 text-sm text-[#2C201B]/62">
                            Organize a estrutura financeira, vincule obras quando fizer sentido e mantenha um unico centro principal ativo por obra.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={refreshCostCenters} disabled={isFetching}>
                        {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
                        Atualizar
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <Plus className="size-4" />
                        Novo Centro de Custo
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Total" value={String(summary.total)} icon={Blocks} />
                <SummaryCard label="Ativos" value={String(summary.active)} icon={CheckCircle2} />
                <SummaryCard label="Com obra" value={String(summary.linked)} icon={Building2} />
                <SummaryCard label="Sem obra" value={String(summary.unlinked)} icon={Target} />
            </div>

            <Card className="border border-[rgba(44,32,27,0.08)] bg-[#FFFCF7]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-[#2C201B]">Filtros</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2C201B]/35" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por nome, descricao ou obra"
                                className="h-11 border-[#2C201B]/10 bg-white pl-9"
                            />
                        </div>

                        <div className="w-full lg:w-52">
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                            >
                                <SelectTrigger className="h-11 border-[#2C201B]/10 bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="active">Ativos</SelectItem>
                                    <SelectItem value="inactive">Inativos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full lg:w-56">
                            <Select
                                value={workLinkFilter}
                                onValueChange={(value) => setWorkLinkFilter(value as WorkLinkFilter)}
                            >
                                <SelectTrigger className="h-11 border-[#2C201B]/10 bg-white">
                                    <SelectValue placeholder="Vinculo com obra" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="linked">Com obra</SelectItem>
                                    <SelectItem value="unlinked">Sem obra</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border border-[rgba(44,32,27,0.08)] bg-[#FFFCF7]">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#2C201B]/8 hover:bg-transparent">
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">
                                    Nome
                                </TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">
                                    Descricao
                                </TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">
                                    Obra associada
                                </TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">
                                    Status
                                </TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">
                                    Uso no financeiro
                                </TableHead>
                                <TableHead className="h-12 px-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">
                                    Acoes
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleCostCenters.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={6} className="px-4 py-14 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[#2C201B]/50">
                                            <Blocks className="size-10" />
                                            <div className="space-y-1">
                                                <p className="font-medium text-[#2C201B]">
                                                    Nenhum centro de custo encontrado
                                                </p>
                                                <p className="text-sm">
                                                    Ajuste os filtros ou crie um novo centro de custo.
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleCostCenters.map((costCenter) => (
                                    <TableRow
                                        key={costCenter.id}
                                        className="border-[#2C201B]/6 bg-white/70 hover:bg-[#FAF3E0]/35"
                                    >
                                        <TableCell className="px-4 py-3">
                                            <div className="space-y-1">
                                                <p className="font-medium text-[#2C201B]">
                                                    {costCenter.nome}
                                                </p>
                                                <p className="text-xs text-[#2C201B]/52">
                                                    ID #{costCenter.id}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-[#2C201B]/72">
                                            <p className="max-w-[280px] truncate">
                                                {costCenter.descricao?.trim() || "Sem descricao"}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="space-y-2">
                                                <p className="text-sm text-[#2C201B]/78">
                                                    {getWorkLabel(costCenter)}
                                                </p>
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
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                                                    costCenter.ativo
                                                        ? "border-[#393316]/16 bg-[#F2F5E7] text-[#393316]"
                                                        : "border-[#2C201B]/12 bg-[#F5F1E8] text-[#2C201B]/62"
                                                )}
                                            >
                                                {costCenter.ativo ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-[#2C201B]/72">
                                            {getUsageLabel(costCenter)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-[#2C201B]/62 hover:bg-[#FAF3E0] hover:text-[#2C201B]"
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                        <span className="sr-only">Abrir acoes</span>
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
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="border-[#2C201B]/10 bg-[#FFFCF7] sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCostCenter ? "Editar Centro de Custo" : "Novo Centro de Custo"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCostCenter
                                ? "Atualize os dados do centro de custo. O vinculo com obra e gerenciado em uma acao separada."
                                : "Crie um centro de custo para uso operacional ou associacao posterior a uma obra."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="cost-center-name">Nome</Label>
                            <Input
                                id="cost-center-name"
                                value={formState.nome}
                                onChange={(event) => updateForm("nome", event.target.value)}
                                placeholder="Ex.: Obra Alto Padrao - Principal"
                                className="border-[#2C201B]/10 bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cost-center-description">Descricao</Label>
                            <Textarea
                                id="cost-center-description"
                                value={formState.descricao}
                                onChange={(event) => updateForm("descricao", event.target.value)}
                                placeholder="Contexto adicional para identificacao interna."
                                className="min-h-28 border-[#2C201B]/10 bg-white"
                            />
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
                        >
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            {editingCostCenter ? "Salvar alteracoes" : "Criar centro"}
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
                            <p className="text-sm font-medium text-[#2C201B]">
                                {selectedCostCenter?.nome ?? "Centro de custo"}
                            </p>
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
                                    placeholder="Pesquisar por titulo, cliente ou endereco"
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
                                        Remover selecao
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
                                                        <p className="font-medium text-[#2C201B]">
                                                            {getWorkSearchLabel(work)}
                                                        </p>
                                                        {work.nomeReceptor ? (
                                                            <p className="text-sm text-[#2C201B]/62">
                                                                Cliente: {work.nomeReceptor}
                                                            </p>
                                                        ) : null}
                                                        {work.enderecoEntrega ? (
                                                            <p className="text-sm text-[#2C201B]/56">
                                                                {work.enderecoEntrega}
                                                            </p>
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setWorkDialogOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleSaveWorkLink} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            Salvar vinculo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent className="border-[#2C201B]/10 bg-[#FFFCF7]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {selectedCostCenter?.ativo
                                ? "Desativar centro de custo?"
                                : "Ativar centro de custo?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedCostCenter?.ativo
                                ? "O centro deixara de aparecer nas novas selecoes operacionais, mas todo o historico financeiro sera preservado."
                                : "O centro voltara a ficar disponivel para uso nas operacoes financeiras."}
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
