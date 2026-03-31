"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import {
    ArrowRight,
    CheckCircle2,
    CircleDollarSign,
    FolderTree,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Tags,
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
import { cn } from "@/lib/utils"
import type { CategoryOption } from "@/types/financeiro"

type Props = {
    initialCategories: CategoryOption[]
}

type StatusFilter = "all" | "active" | "inactive"
type CategoryType = "RECEITA" | "DESPESA"

type CategoryFormState = {
    nome: string
    tipo: CategoryType
    cor: string
    icone: string
    categoria_pai_id: string
}

type SummaryCardProps = {
    label: string
    value: string
    icon: ComponentType<{ className?: string }>
}

type CategoryRow = CategoryOption & {
    level: 1 | 2
    parentName: string | null
}

const DEFAULT_COLOR = "#F5D193"

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
    { value: "RECEITA", label: "Receita" },
    { value: "DESPESA", label: "Despesa" },
]

const EMPTY_FORM: CategoryFormState = {
    nome: "",
    tipo: "DESPESA",
    cor: DEFAULT_COLOR,
    icone: "",
    categoria_pai_id: "",
}

function normalizeColor(color: string) {
    const value = color.trim()
    if (!value) return undefined

    const normalized = value.startsWith("#") ? value.slice(0, 7) : `#${value.slice(0, 6)}`
    return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : undefined
}

function getColorValue(color: string | null | undefined) {
    return normalizeColor(color ?? "") ?? DEFAULT_COLOR
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

function flattenCategories(categories: CategoryOption[]) {
    return categories.flatMap<CategoryRow>((category) => {
        const parentRow: CategoryRow = {
            ...category,
            level: 1,
            parentName: null,
        }

        const childRows = (category.subcategorias ?? []).map<CategoryRow>((subcategory) => ({
            ...subcategory,
            level: 2,
            parentName: category.nome,
        }))

        return [parentRow, ...childRows]
    })
}

function buildFormState(category?: CategoryOption | null): CategoryFormState {
    if (!category) {
        return EMPTY_FORM
    }

    return {
        nome: category.nome,
        tipo: category.tipo === "RECEITA" ? "RECEITA" : "DESPESA",
        cor: getColorValue(category.cor),
        icone: category.icone ?? "",
        categoria_pai_id: category.categoria_pai_id ? String(category.categoria_pai_id) : "",
    }
}

function getTypeLabel(type: string) {
    return type === "RECEITA" ? "Receita" : "Despesa"
}

function getLevelLabel(level: 1 | 2) {
    return level === 1 ? "Categoria" : "Subcategoria"
}

function getUsageLabel(category: CategoryRow) {
    if ((category.usageCount ?? 0) === 0) {
        return "Sem vínculos"
    }

    return [
        `${category.lancamentosCount ?? 0} lanç.`,
        `${category.contasPagarCount ?? 0} pagar`,
        `${category.contasReceberCount ?? 0} receber`,
    ].join(" • ")
}

export default function FinancialCategoriesPageClient({ initialCategories }: Props) {
    const [categories, setCategories] = useState(initialCategories)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [isFetching, setIsFetching] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [statusDialogOpen, setStatusDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null)
    const [formState, setFormState] = useState<CategoryFormState>(EMPTY_FORM)

    async function refreshCategories() {
        try {
            setIsFetching(true)
            const response = await fetch("/api/financeiro/categories?active=false", {
                cache: "no-store",
            })

            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(payload?.error ?? "Erro ao atualizar categorias financeiras")
            }

            setCategories((await response.json()) as CategoryOption[])
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsFetching(false)
        }
    }

    const flatCategories = useMemo(() => flattenCategories(categories), [categories])

    const parentOptions = useMemo(() => {
        return flatCategories.filter((category) => {
            if (category.level !== 1 || category.ativo === false) {
                return false
            }

            if (category.id === editingCategory?.id) {
                return false
            }

            return category.tipo === formState.tipo
        })
    }, [editingCategory?.id, flatCategories, formState.tipo])

    const selectedParent = useMemo(() => {
        if (!formState.categoria_pai_id) {
            return null
        }

        return flatCategories.find((category) => category.id === Number(formState.categoria_pai_id)) ?? null
    }, [flatCategories, formState.categoria_pai_id])

    useEffect(() => {
        if (!selectedParent) {
            return
        }

        const parentType = selectedParent.tipo === "RECEITA" ? "RECEITA" : "DESPESA"

        setFormState((current) => {
            if (current.tipo === parentType) {
                return current
            }

            return {
                ...current,
                tipo: parentType,
            }
        })
    }, [selectedParent])

    const visibleCategories = useMemo(() => {
        const term = search.trim().toLowerCase()

        return flatCategories.filter((category) => {
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && category.ativo !== false) ||
                (statusFilter === "inactive" && category.ativo === false)

            if (!matchesStatus) {
                return false
            }

            if (!term) {
                return true
            }

            return [
                category.nome,
                category.parentName ?? "",
                category.icone ?? "",
                getTypeLabel(category.tipo),
                getLevelLabel(category.level),
            ].some((value) => value.toLowerCase().includes(term))
        })
    }, [flatCategories, search, statusFilter])

    const summary = useMemo(() => {
        return visibleCategories.reduce(
            (accumulator, category) => {
                accumulator.total += 1
                accumulator.active += category.ativo === false ? 0 : 1
                accumulator.parents += category.level === 1 ? 1 : 0
                accumulator.children += category.level === 2 ? 1 : 0
                return accumulator
            },
            {
                total: 0,
                active: 0,
                parents: 0,
                children: 0,
            },
        )
    }, [visibleCategories])

    function openCreateDialog() {
        setEditingCategory(null)
        setFormState(EMPTY_FORM)
        setFormOpen(true)
    }

    function openEditDialog(category: CategoryRow) {
        setEditingCategory(category)
        setFormState(buildFormState(category))
        setFormOpen(true)
    }

    function openStatusDialog(category: CategoryRow) {
        setSelectedCategory(category)
        setStatusDialogOpen(true)
    }

    function updateField<K extends keyof CategoryFormState>(field: K, value: CategoryFormState[K]) {
        setFormState((current) => ({
            ...current,
            [field]: value,
        }))
    }

    function handleTypeChange(value: CategoryType) {
        setFormState((current) => ({
            ...current,
            tipo: value,
            categoria_pai_id:
                current.categoria_pai_id && selectedParent?.tipo !== value
                    ? ""
                    : current.categoria_pai_id,
        }))
    }

    function handleParentChange(value: string) {
        if (value === "none") {
            setFormState((current) => ({
                ...current,
                categoria_pai_id: "",
            }))
            return
        }

        const parent = flatCategories.find((category) => category.id === Number(value))

        setFormState((current) => ({
            ...current,
            categoria_pai_id: value,
            tipo: parent?.tipo === "RECEITA" ? "RECEITA" : "DESPESA",
        }))
    }

    async function handleSubmitForm() {
        try {
            setIsSubmitting(true)

            const payload = editingCategory
                ? {
                    id: editingCategory.id,
                    nome: formState.nome.trim(),
                    cor: normalizeColor(formState.cor),
                    icone: formState.icone.trim() || undefined,
                }
                : {
                    nome: formState.nome.trim(),
                    tipo: formState.tipo,
                    cor: normalizeColor(formState.cor),
                    icone: formState.icone.trim() || undefined,
                    categoria_pai_id: formState.categoria_pai_id
                        ? Number(formState.categoria_pai_id)
                        : undefined,
                }

            const response = await fetch("/api/financeiro/categories", {
                method: editingCategory ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao salvar categoria financeira")
            }

            await refreshCategories()
            toast.success(editingCategory ? "Categoria atualizada" : "Categoria criada")
            setFormOpen(false)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleToggleStatus() {
        if (!selectedCategory) {
            return
        }

        try {
            setIsSubmitting(true)

            const response = selectedCategory.ativo === false
                ? await fetch("/api/financeiro/categories", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: selectedCategory.id,
                        ativo: true,
                    }),
                })
                : await fetch(`/api/financeiro/categories?id=${selectedCategory.id}`, {
                    method: "DELETE",
                })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao atualizar status da categoria")
            }

            await refreshCategories()
            toast.success(selectedCategory.ativo === false ? "Categoria ativada" : "Categoria desativada")
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
                        <Tags className="size-3.5" />
                        Configurações Financeiras
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#2C201B]">
                            Categorias Financeiras
                        </h1>
                        <p className="mt-1 text-sm text-[#2C201B]/62">
                            Organize categorias e subcategorias do financeiro, mantendo tipo fixo após a criação e controle de status sem perder histórico.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={refreshCategories} disabled={isFetching}>
                        {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
                        Atualizar
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <Plus className="size-4" />
                        Nova Categoria
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Total" value={String(summary.total)} icon={Tags} />
                <SummaryCard label="Ativas" value={String(summary.active)} icon={CheckCircle2} />
                <SummaryCard label="Categorias" value={String(summary.parents)} icon={FolderTree} />
                <SummaryCard label="Subcategorias" value={String(summary.children)} icon={CircleDollarSign} />
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
                                placeholder="Buscar por nome, tipo, nível ou categoria pai"
                                className="h-11 border-[#2C201B]/10 bg-white pl-9"
                            />
                        </div>

                        <div className="w-full lg:w-52">
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                                <SelectTrigger className="h-11 border-[#2C201B]/10 bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="active">Ativas</SelectItem>
                                    <SelectItem value="inactive">Inativas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-[rgba(44,32,27,0.08)] bg-[#FFFCF7]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-[#2C201B]">
                        Estrutura de categorias
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#2C201B]/8">
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Nível</TableHead>
                                    <TableHead>Pai</TableHead>
                                    <TableHead>Uso</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-sm text-[#2C201B]/55">
                                            Nenhuma categoria encontrada com os filtros atuais.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleCategories.map((category) => (
                                        <TableRow key={category.id} className="border-[#2C201B]/8">
                                            <TableCell className="min-w-[260px]">
                                                <div
                                                    className={cn(
                                                        "flex items-center gap-3",
                                                        category.level === 2 && "pl-6",
                                                    )}
                                                >
                                                    {category.level === 2 ? (
                                                        <ArrowRight className="size-4 text-[#2C201B]/35" />
                                                    ) : (
                                                        <FolderTree className="size-4 text-[#393316]" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-[#2C201B]">
                                                                {category.nome}
                                                            </span>
                                                            <span
                                                                className="inline-flex h-3 w-3 rounded-full border border-[#2C201B]/10"
                                                                style={{ backgroundColor: getColorValue(category.cor) }}
                                                            />
                                                            {category.icone ? (
                                                                <span className="rounded-full border border-[#2C201B]/10 bg-[#FAF3E0] px-2 py-0.5 text-xs text-[#2C201B]/65">
                                                                    {category.icone}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {category.level === 1 && (category.subcategoriasCount ?? 0) > 0 ? (
                                                            <p className="mt-1 text-xs text-[#2C201B]/52">
                                                                {(category.subcategoriasCount ?? 0)} subcategoria(s)
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "border-none",
                                                        category.tipo === "RECEITA"
                                                            ? "bg-[#E8F5E9] text-[#166534]"
                                                            : "bg-[#FDECEC] text-[#B42318]",
                                                    )}
                                                >
                                                    {getTypeLabel(category.tipo)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-[#2C201B]/10 text-[#2C201B]/70">
                                                    {getLevelLabel(category.level)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-[#2C201B]/70">
                                                {category.parentName ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-[#2C201B]/70">
                                                {getUsageLabel(category)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "border-none",
                                                        category.ativo === false
                                                            ? "bg-[#FDECEC] text-[#B42318]"
                                                            : "bg-[#ECFDF3] text-[#027A48]",
                                                    )}
                                                >
                                                    {category.ativo === false ? "Inativa" : "Ativa"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                                            <Pencil className="mr-2 size-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openStatusDialog(category)}>
                                                            {category.ativo === false ? "Ativar" : "Desativar"}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Editar categoria" : "Nova categoria financeira"}</DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "Atualize nome, cor e ícone. O tipo permanece fixo após a criação."
                                : "Crie categorias pai ou subcategorias. O tipo fica travado após a criação."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="category-name">Nome</Label>
                            <Input
                                id="category-name"
                                value={formState.nome}
                                onChange={(event) => updateField("nome", event.target.value)}
                                placeholder="Ex.: Folha de Pagamento"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="category-parent">Categoria Pai</Label>
                            {editingCategory ? (
                                <Input
                                    id="category-parent"
                                    value={editingCategory.parentName ?? "Sem categoria pai"}
                                    readOnly
                                    className="bg-[#F8F3E8]"
                                />
                            ) : (
                                <Select
                                    value={formState.categoria_pai_id || "none"}
                                    onValueChange={handleParentChange}
                                >
                                    <SelectTrigger id="category-parent" className="bg-white">
                                        <SelectValue placeholder="Sem categoria pai" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem categoria pai</SelectItem>
                                        {parentOptions.map((category) => (
                                            <SelectItem key={category.id} value={String(category.id)}>
                                                {category.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="category-type">Tipo</Label>
                            {editingCategory ? (
                                <Input
                                    id="category-type"
                                    value={getTypeLabel(formState.tipo)}
                                    readOnly
                                    className="bg-[#F8F3E8]"
                                />
                            ) : (
                                <Select
                                    value={formState.tipo}
                                    onValueChange={(value) => handleTypeChange(value as CategoryType)}
                                    disabled={Boolean(selectedParent)}
                                >
                                    <SelectTrigger id="category-type" className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TYPE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[120px,1fr] sm:items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="category-color">Cor</Label>
                                <Input
                                    id="category-color"
                                    type="color"
                                    value={getColorValue(formState.cor)}
                                    onChange={(event) => updateField("cor", event.target.value)}
                                    className="h-11 p-1"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category-icon">Ícone</Label>
                                <Input
                                    id="category-icon"
                                    value={formState.icone}
                                    onChange={(event) => updateField("icone", event.target.value)}
                                    placeholder="Ex.: wallet, hammer, receipt"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmitForm} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            {editingCategory ? "Salvar alterações" : "Criar categoria"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {selectedCategory?.ativo === false ? "Ativar categoria" : "Desativar categoria"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedCategory?.ativo === false
                                ? "A categoria voltará a aparecer nos cadastros administrativos e nos filtros operacionais ativos."
                                : "A categoria ficará fora dos cadastros ativos, mas continuará preservada no histórico financeiro."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleStatus} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
