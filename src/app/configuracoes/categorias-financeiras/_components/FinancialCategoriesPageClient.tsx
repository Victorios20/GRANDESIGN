"use client"

import { type FormEvent, useMemo, useState } from "react"
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
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
import {
  operationalListControlClass,
  operationalListMutedButtonClass,
  operationalListPrimaryButtonClass,
  operationalListSearchInputClass,
  operationalListShellClass,
  operationalListTableHeadCellClass,
  operationalListTableHeadClass,
  operationalListTableHeadRowClass,
  operationalListTableRowClass,
} from "@/components/ui/operational-list-styles"
import {
  getFixedFinancialGroup,
  getFixedFinancialGroups,
  resolveFinancialGroupName,
  sortOperationalCategoriesByGroup,
  type FixedFinancialGroupName,
} from "@/lib/financial/fixed-category-taxonomy"
import { cn } from "@/lib/utils"
import type { CategoryOption } from "@/types/financeiro"

type Props = {
  initialCategories: CategoryOption[]
}

type StatusFilter = "all" | "active" | "inactive"

type CategoryFormState = {
  nome: string
  grupo: FixedFinancialGroupName
}

type OperationalCategoryRow = CategoryOption & {
  grupo: FixedFinancialGroupName
  categoriaPai: {
    id: number
    nome: string
  }
}

type GroupSectionView = {
  name: FixedFinancialGroupName
  accountingLabel: "Receita" | "Custo" | "Despesa" | "Fora da DRE"
  description: string
  rows: OperationalCategoryRow[]
  totalRows: number
}

type PendingAction =
  | {
      mode: "delete"
      category: OperationalCategoryRow
    }
  | {
      mode: "restore"
      category: OperationalCategoryRow
    }

const GROUP_DESCRIPTION: Record<FixedFinancialGroupName, string> = {
  Receita: "Entradas operacionais que compoem a base principal da receita.",
  "Receita de Ajuste":
    "Entradas de acerto que precisam permanecer separadas na leitura do resultado.",
  "Custos diretos":
    "Saidas diretamente ligadas a execucao, producao ou entrega do servico.",
  "Despesas financeiras":
    "Saidas financeiras que afetam o resultado, mas nao compoem custo direto.",
  "Despesas operacionais":
    "Saidas administrativas e operacionais da rotina financeira.",
  "Despesa de ajuste":
    "Saidas de acerto que precisam ficar destacadas nos relatorios.",
  "Distribui\u00e7\u00e3o de Lucros":
    "Movimentos operacionais fora da DRE, sem impacto no resultado operacional.",
  "Transfer\u00eancia":
    "Movimentos internos entre contas, fora da DRE e fora do calculo de margem.",
}

const GROUP_CANONICAL_NAME: Record<FixedFinancialGroupName, string> = {
  Receita: "Receita",
  "Receita de Ajuste": "Receita de Ajuste",
  "Custos diretos": "Custos diretos",
  "Despesas financeiras": "Despesas financeiras",
  "Despesas operacionais": "Despesas operacionais",
  "Despesa de ajuste": "Despesa de ajuste",
  "Distribui\u00e7\u00e3o de Lucros": "Distribui\u00e7\u00e3o de Lucros",
  "Transfer\u00eancia": "Transfer\u00eancia",
}

const GROUP_BADGE_CLASS: Record<
  GroupSectionView["accountingLabel"],
  string
> = {
  Receita: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Custo: "border-amber-200 bg-amber-50 text-amber-700",
  Despesa: "border-rose-200 bg-rose-50 text-rose-700",
  "Fora da DRE": "border-slate-200 bg-slate-50 text-slate-700",
}

const SECTION_CLASS: Record<GroupSectionView["accountingLabel"], string> = {
  Receita: "border-l-emerald-500 bg-emerald-50/60",
  Custo: "border-l-amber-500 bg-amber-50/60",
  Despesa: "border-l-rose-500 bg-rose-50/60",
  "Fora da DRE": "border-l-slate-500 bg-slate-50/70",
}

const EMPTY_FORM: CategoryFormState = {
  nome: "",
  grupo: "Receita",
}

function normalizeGroupName(name: string) {
  return name as FixedFinancialGroupName
}

function getUsageCount(category: CategoryOption) {
  return category.usageCount ?? 0
}

function getUsageLabel(category: CategoryOption) {
  const parts: string[] = []

  if (category.lancamentosCount) parts.push(`${category.lancamentosCount} lanc.`)
  if (category.contasPagarCount) parts.push(`${category.contasPagarCount} pagar`)
  if (category.contasReceberCount) parts.push(`${category.contasReceberCount} receber`)

  return parts.length > 0 ? parts.join(" | ") : "Sem vinculos"
}

function getStatusBadgeClass(isActive: boolean) {
  return isActive
    ? "border-[#393316]/16 bg-[#F2F5E7] text-[#393316]"
    : "border-[#2C201B]/12 bg-[#F5F1E8] text-[#2C201B]/62"
}

function buildFormState(category?: OperationalCategoryRow | null): CategoryFormState {
  if (!category) {
    return EMPTY_FORM
  }

  return {
    nome: category.nome,
    grupo: category.grupo,
  }
}

function matchesStatus(category: CategoryOption, statusFilter: StatusFilter) {
  const isActive = category.ativo !== false

  if (statusFilter === "all") return true
  if (statusFilter === "active") return isActive
  return !isActive
}

function buildOperationalRows(categories: CategoryOption[]) {
  return categories.flatMap<OperationalCategoryRow>((parent) => {
    const rawGroupName = resolveFinancialGroupName(parent)
    const groupName = rawGroupName ? normalizeGroupName(rawGroupName) : null

    if (!groupName) {
      return []
    }

    const children = sortOperationalCategoriesByGroup(
      parent.subcategorias ?? [],
      groupName,
    )

    return children.map((child) => ({
      ...child,
      grupo: groupName,
      categoriaPai:
        child.categoriaPai ??
        ({
          id: parent.id,
          nome: GROUP_CANONICAL_NAME[groupName],
        } as OperationalCategoryRow["categoriaPai"]),
    }))
  })
}

export default function FinancialCategoriesPageClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [isFetching, setIsFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<OperationalCategoryRow | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
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

  const operationalRows = useMemo(() => buildOperationalRows(categories), [categories])

  const parentIdByGroup = useMemo(() => {
    return new Map(
      categories
        .filter((category) => !category.categoria_pai_id)
        .map((category) => [
          normalizeGroupName(category.nome),
          category.id,
        ] as const),
    )
  }, [categories])

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase()

    return getFixedFinancialGroups()
      .map<GroupSectionView>((group) => {
        const normalizedGroupName = normalizeGroupName(group.name)
        const rows = operationalRows.filter((row) => {
          if (row.grupo !== normalizedGroupName) {
            return false
          }

          if (!matchesStatus(row, statusFilter)) {
            return false
          }

          if (!term) {
            return true
          }

          return [row.nome, GROUP_CANONICAL_NAME[normalizedGroupName]]
            .join(" ")
            .toLowerCase()
            .includes(term)
        })

        return {
          name: normalizedGroupName,
          accountingLabel: group.accountingLabel,
          description: GROUP_DESCRIPTION[normalizedGroupName],
          rows,
          totalRows: operationalRows.filter((row) => row.grupo === normalizedGroupName).length,
        }
      })
      .filter((group) => {
        if (!search.trim() && statusFilter === "all") {
          return true
        }

        return group.rows.length > 0
      })
  }, [operationalRows, search, statusFilter])

  const visibleCount = useMemo(
    () => visibleGroups.reduce((total, group) => total + group.rows.length, 0),
    [visibleGroups],
  )

  function openCreateDialog() {
    setEditingCategory(null)
    setFormState(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditDialog(category: OperationalCategoryRow) {
    setEditingCategory(category)
    setFormState(buildFormState(category))
    setFormError(null)
    setFormOpen(true)
  }

  function updateField<K extends keyof CategoryFormState>(
    field: K,
    value: CategoryFormState[K],
  ) {
    setFormState((current) => ({ ...current, [field]: value }))
    if (field === "nome" && String(value).trim()) {
      setFormError(null)
    }
  }

  async function handleSubmitForm(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    const nome = formState.nome.trim()
    if (!nome) {
      setFormError("Informe a descricao da categoria.")
      return
    }

    const selectedGroup = getFixedFinancialGroup(formState.grupo)
    const parentId = parentIdByGroup.get(formState.grupo)

    if (!selectedGroup || !parentId) {
      setFormError("Nao foi possivel localizar o grupo selecionado.")
      return
    }

    try {
      setIsSubmitting(true)

      const payload = editingCategory
        ? {
            id: editingCategory.id,
            nome,
            categoria_pai_id: parentId,
            tipo: selectedGroup.tipo,
          }
        : {
            nome,
            categoria_pai_id: parentId,
            tipo: selectedGroup.tipo,
          }

      const response = await fetch("/api/financeiro/categories", {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error ?? "Erro ao salvar categoria financeira")
      }

      await refreshCategories()
      toast.success(editingCategory ? "Categoria atualizada" : "Categoria criada")
      setFormOpen(false)
      setEditingCategory(null)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePendingAction() {
    if (!pendingAction) {
      return
    }

    try {
      setIsSubmitting(true)

      const response =
        pendingAction.mode === "restore"
          ? await fetch("/api/financeiro/categories", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: pendingAction.category.id, ativo: true }),
            })
          : await fetch(`/api/financeiro/categories?id=${pendingAction.category.id}`, {
              method: "DELETE",
            })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error ?? "Erro ao atualizar categoria")
      }

      await refreshCategories()
      toast.success(
        pendingAction.mode === "restore"
          ? "Categoria reativada"
          : "Categoria excluida",
      )
      setPendingAction(null)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2C201B]">
            Categorias financeiras
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[#6F6556]">
            Organize receitas, custos e despesas em uma taxonomia fixa para manter
            DRE, margens e leitura operacional consistentes.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreateDialog}
          className={cn(operationalListPrimaryButtonClass, "h-10 px-4")}
        >
          <Plus className="size-4" />
          Nova categoria
        </Button>
      </header>

      <section className={cn(operationalListShellClass, "overflow-hidden")}>
        <div className="border-b border-[#EAE1D0]/80 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9A8F7C]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar categoria ou grupo"
                className={cn(operationalListSearchInputClass, "w-full")}
              />
            </div>

            <div className="w-full lg:w-52">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className={cn(operationalListControlClass, "h-10")}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#EFE7DB] px-4 py-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#2C201B]">
              {visibleCount} {visibleCount === 1 ? "categoria visivel" : "categorias visiveis"}
            </p>
            <p className="text-xs text-[#8B7355]">
              {operationalRows.length} categorias operacionais na taxonomia fixa
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8B7355]">
            {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{getFixedFinancialGroups().length} grupos fixos</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className={operationalListTableHeadClass}>
              <tr className={operationalListTableHeadRowClass}>
                <th className={operationalListTableHeadCellClass}>Descricao</th>
                <th className={operationalListTableHeadCellClass}>Grupo</th>
                <th className={operationalListTableHeadCellClass}>Classificacao contabil</th>
                <th className={operationalListTableHeadCellClass}>Uso no financeiro</th>
                <th className={operationalListTableHeadCellClass}>Status</th>
                <th className={cn(operationalListTableHeadCellClass, "text-right")}>
                  Acoes
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EFE8DC]">
              {visibleGroups.length === 0 || visibleCount === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[#2C201B]">
                        Nenhuma categoria encontrada
                      </p>
                      <p className="text-sm text-[#6F6556]">
                        Ajuste a busca, revise o filtro de status ou cadastre uma nova
                        categoria operacional.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleGroups.map((group) => (
                  <GroupSection
                    key={group.name}
                    group={group}
                    onEdit={openEditDialog}
                    onRequestAction={setPendingAction}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CategoryFormDialog
        editingCategory={editingCategory}
        formError={formError}
        formOpen={formOpen}
        formState={formState}
        isSubmitting={isSubmitting}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmitForm}
        onUpdateField={updateField}
      />

      <CategoryActionDialog
        isSubmitting={isSubmitting}
        pendingAction={pendingAction}
        onConfirm={handlePendingAction}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null)
          }
        }}
      />
    </div>
  )
}

function GroupSection({
  group,
  onEdit,
  onRequestAction,
}: {
  group: GroupSectionView
  onEdit: (category: OperationalCategoryRow) => void
  onRequestAction: (action: PendingAction) => void
}) {
  return (
    <>
      <tr>
        <td colSpan={6} className="px-0 py-0">
          <div
            className={cn(
              "flex items-center justify-between border-l-[3px] px-4 py-3",
              SECTION_CLASS[group.accountingLabel],
            )}
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3D3128]">
                {GROUP_CANONICAL_NAME[group.name]}
              </p>
              <p className="text-sm text-[#6F6556]">{group.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-[11px]", GROUP_BADGE_CLASS[group.accountingLabel])}
              >
                {group.accountingLabel}
              </Badge>
              <Badge
                variant="outline"
                className="border-[#E7DCCB] bg-[#FFFCF7] text-[11px] text-[#6F6556]"
              >
                {group.rows.length} de {group.totalRows}
              </Badge>
            </div>
          </div>
        </td>
      </tr>

      {group.rows.map((row) => {
        const isActive = row.ativo !== false

        return (
          <tr key={row.id} className={cn(operationalListTableRowClass, "group")}>
            <td className="px-4 py-3">
              <div className="space-y-1">
                <p className="font-medium text-[#2C201B]">{row.nome}</p>
                <p className="text-xs text-[#8B7355]">Categoria operacional</p>
              </div>
            </td>

            <td className="px-4 py-3 text-[#2C201B]/80">
              {GROUP_CANONICAL_NAME[row.grupo]}
            </td>

            <td className="px-4 py-3">
              <Badge
                variant="outline"
                className={cn(
                  "font-medium",
                  GROUP_BADGE_CLASS[group.accountingLabel],
                )}
              >
                {group.accountingLabel}
              </Badge>
            </td>

            <td className="px-4 py-3 text-[#2C201B]/72">
              <div className="space-y-1">
                <p className="font-medium text-[#2C201B]">
                  {getUsageCount(row) > 0 ? `${getUsageCount(row)} vinculos` : "Sem vinculos"}
                </p>
                <p className="text-xs text-[#8B7355]">{getUsageLabel(row)}</p>
              </div>
            </td>

            <td className="px-4 py-3">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  getStatusBadgeClass(isActive),
                )}
              >
                {isActive ? "Ativa" : "Inativa"}
              </Badge>
            </td>

            <td className="px-4 py-3 text-right">
              <RowActions
                category={row}
                onEdit={onEdit}
                onRequestAction={onRequestAction}
              />
            </td>
          </tr>
        )
      })}
    </>
  )
}

function RowActions({
  category,
  onEdit,
  onRequestAction,
}: {
  category: OperationalCategoryRow
  onEdit: (category: OperationalCategoryRow) => void
  onRequestAction: (action: PendingAction) => void
}) {
  return (
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

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onEdit(category)}>
          <Pencil className="mr-2 size-4" />
          Editar
        </DropdownMenuItem>

        {category.ativo === false ? (
          <DropdownMenuItem
            onClick={() =>
              onRequestAction({
                mode: "restore",
                category,
              })
            }
          >
            <Undo2 className="mr-2 size-4" />
            Reativar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-[#8F3F37] focus:text-[#8F3F37]"
            onClick={() =>
              onRequestAction({
                mode: "delete",
                category,
              })
            }
          >
            <Trash2 className="mr-2 size-4" />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CategoryFormDialog({
  editingCategory,
  formError,
  formOpen,
  formState,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onUpdateField,
}: {
  editingCategory: OperationalCategoryRow | null
  formError: string | null
  formOpen: boolean
  formState: CategoryFormState
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void
  onUpdateField: <K extends keyof CategoryFormState>(
    field: K,
    value: CategoryFormState[K],
  ) => void
}) {
  const selectedGroup = getFixedFinancialGroup(formState.grupo)

  return (
    <Dialog
      open={formOpen}
      onOpenChange={(open) => {
        if (isSubmitting) return
        onOpenChange(open)
      }}
    >
      <DialogContent className="overflow-hidden border-[#E7DCCB] p-0 sm:max-w-[520px]">
        <DialogHeader className="border-b border-[#EFE7DB] px-6 py-5">
          <DialogTitle className="text-lg font-semibold text-[#2C201B]">
            {editingCategory ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6F6556]">
            Cadastre a categoria operacional dentro do grupo correto para manter DRE e
            resultado consistentes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="financial-category-name"
                className="text-sm font-medium text-[#3D3128]"
              >
                Descricao
              </Label>
              <Input
                id="financial-category-name"
                autoFocus
                value={formState.nome}
                onChange={(event) => onUpdateField("nome", event.target.value)}
                placeholder="Ex: Imposto sobre servico, Compra de material"
                className={cn(
                  "h-10 border-[#DCCFBE] bg-white text-[#2C201B] placeholder:text-[#9C8F7B]",
                  formError && "border-[#C65B4B] focus-visible:ring-[#C65B4B]/20",
                )}
              />
              {formError ? (
                <p className="text-xs font-medium text-[#C65B4B]">{formError}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="financial-category-group"
                  className="text-sm font-medium text-[#3D3128]"
                >
                  Grupo
                </Label>
                <Select
                  value={formState.grupo}
                  onValueChange={(value) =>
                    onUpdateField("grupo", value as FixedFinancialGroupName)
                  }
                >
                  <SelectTrigger
                    id="financial-category-group"
                    className={cn(operationalListControlClass, "h-10")}
                  >
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFixedFinancialGroups().map((group) => (
                      <SelectItem
                        key={group.name}
                        value={normalizeGroupName(group.name)}
                      >
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="financial-category-accounting"
                  className="text-sm font-medium text-[#3D3128]"
                >
                  Classificacao contabil
                </Label>
                <div
                  id="financial-category-accounting"
                  className="flex h-10 items-center rounded-md border border-[#E7DCCB] bg-[#F8F4EC] px-3 text-sm text-[#6F6556]"
                >
                  {selectedGroup?.accountingLabel ?? "Nao definido"}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-[#EFE7DB] px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className={cn(operationalListMutedButtonClass, "h-10 px-4")}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(operationalListPrimaryButtonClass, "h-10 px-5")}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {editingCategory ? "Salvar alteracoes" : "Salvar categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CategoryActionDialog({
  isSubmitting,
  pendingAction,
  onConfirm,
  onOpenChange,
}: {
  isSubmitting: boolean
  pendingAction: PendingAction | null
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const open = Boolean(pendingAction)
  const isRestore = pendingAction?.mode === "restore"

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return
        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent className="border-[#E7DCCB]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#2C201B]">
            {isRestore ? "Reativar categoria?" : "Excluir categoria?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#6F6556]">
            {isRestore
              ? "A categoria volta a aparecer nos cadastros e operacoes financeiras."
              : "A categoria sai das selecoes ativas, mantendo o historico financeiro intacto."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Processando..." : isRestore ? "Reativar" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
