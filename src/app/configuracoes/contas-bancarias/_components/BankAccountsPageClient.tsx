"use client"

import { useMemo, useState } from "react"
import type { TipoContaBancaria } from "@prisma/client"
import {
    AlertTriangle,
    CheckCircle2,
    Landmark,
    Loader2,
    MoreHorizontal,
    Pencil,
    PiggyBank,
    Plus,
    Search,
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
import type { BankOption } from "@/types/financeiro"

type Props = {
    initialBanks: BankOption[]
}

type StatusFilter = "all" | "active" | "inactive"

type BankFormState = {
    nome: string
    tipo: TipoContaBancaria
    banco: string
    agencia: string
    conta: string
    cor: string
    saldo_inicial: string
}

const BANK_TYPE_OPTIONS: Array<{ value: TipoContaBancaria; label: string }> = [
    { value: "CORRENTE", label: "Corrente" },
    { value: "POUPANCA", label: "Poupança" },
    { value: "CAIXA", label: "Caixa Físico" },
    { value: "CARTEIRA", label: "Carteira Digital" },
    { value: "INVESTIMENTO", label: "Investimento" },
]

const DEFAULT_COLOR = "#F5D193"

const EMPTY_FORM: BankFormState = {
    nome: "",
    tipo: "CORRENTE",
    banco: "",
    agencia: "",
    conta: "",
    cor: DEFAULT_COLOR,
    saldo_inicial: "0",
}

function formatCurrency(value: number | string | null | undefined) {
    const amount = typeof value === "string" ? Number(value) : (value ?? 0)
    return amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    })
}

function formatBankType(tipo: string) {
    return BANK_TYPE_OPTIONS.find((option) => option.value === tipo)?.label ?? tipo
}

function getStatusLabel(ativo: boolean) {
    return ativo ? "Ativa" : "Inativa"
}

function normalizeColor(color: string) {
    const value = color.trim()
    if (!value) return undefined

    const normalized = value.startsWith("#") ? value.slice(0, 7) : `#${value.slice(0, 6)}`
    return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : undefined
}

function getColorInputValue(color: string) {
    return normalizeColor(color) ?? DEFAULT_COLOR
}

function buildFormState(bank?: BankOption | null): BankFormState {
    if (!bank) {
        return EMPTY_FORM
    }

    return {
        nome: bank.nome,
        tipo: (bank.tipo as TipoContaBancaria) ?? "CORRENTE",
        banco: bank.banco ?? "",
        agencia: bank.agencia ?? "",
        conta: bank.conta ?? "",
        cor: bank.cor ?? DEFAULT_COLOR,
        saldo_inicial: String(bank.saldo_inicial ?? 0),
    }
}

function getAccountDescription(bank: BankOption) {
    const parts = [bank.agencia, bank.conta].filter(Boolean)
    if (parts.length === 0) {
        return "—"
    }

    return parts.join(" / ")
}

export default function BankAccountsPageClient({ initialBanks }: Props) {
    const [banks, setBanks] = useState(initialBanks)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
    const [statusDialogOpen, setStatusDialogOpen] = useState(false)
    const [selectedBank, setSelectedBank] = useState<BankOption | null>(null)
    const [editingBank, setEditingBank] = useState<BankOption | null>(null)
    const [formState, setFormState] = useState<BankFormState>(EMPTY_FORM)
    const [balanceValue, setBalanceValue] = useState("0")

    async function refreshBanks() {
        try {
            const response = await fetch("/api/financeiro/bancos?active=false", {
                cache: "no-store",
            })

            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(payload?.error ?? "Erro ao atualizar contas bancárias")
            }

            setBanks((await response.json()) as BankOption[])
        } catch (error) {
            toast.error((error as Error).message)
        }
    }

    function updateForm<K extends keyof BankFormState>(field: K, value: BankFormState[K]) {
        setFormState((current) => ({
            ...current,
            [field]: value,
        }))
    }

    function openCreateDialog() {
        setEditingBank(null)
        setFormState(EMPTY_FORM)
        setFormOpen(true)
    }

    function openEditDialog(bank: BankOption) {
        setEditingBank(bank)
        setFormState(buildFormState(bank))
        setFormOpen(true)
    }

    function openBalanceDialog(bank: BankOption) {
        setSelectedBank(bank)
        setBalanceValue(String(bank.saldo_inicial ?? 0))
        setBalanceDialogOpen(true)
    }

    function openStatusDialog(bank: BankOption) {
        setSelectedBank(bank)
        setStatusDialogOpen(true)
    }

    const visibleBanks = useMemo(() => {
        const term = search.trim().toLowerCase()

        return banks.filter((bank) => {
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && bank.ativo) ||
                (statusFilter === "inactive" && !bank.ativo)

            if (!matchesStatus) {
                return false
            }

            if (!term) {
                return true
            }

            return [
                bank.nome,
                bank.banco ?? "",
                bank.agencia ?? "",
                bank.conta ?? "",
                formatBankType(bank.tipo),
            ].some((value) => value.toLowerCase().includes(term))
        })
    }, [banks, search, statusFilter])

    async function handleSubmitForm() {
        try {
            setIsSubmitting(true)

            const payload = {
                nome: formState.nome.trim(),
                tipo: formState.tipo,
                banco: formState.banco.trim() || undefined,
                agencia: formState.agencia.trim() || undefined,
                conta: formState.conta.trim() || undefined,
                cor: normalizeColor(formState.cor),
                ...(editingBank
                    ? { id: editingBank.id }
                    : { saldo_inicial: Number(formState.saldo_inicial || 0) }),
            }

            const response = await fetch("/api/financeiro/bancos", {
                method: editingBank ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao salvar conta bancária")
            }

            await refreshBanks()
            toast.success(editingBank ? "Conta bancária atualizada" : "Conta bancária criada")
            setFormOpen(false)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleUpdateInitialBalance() {
        if (!selectedBank) return

        try {
            setIsSubmitting(true)

            const response = await fetch(`/api/financeiro/bancos/${selectedBank.id}/saldo-inicial`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    saldo_inicial: Number(balanceValue || 0),
                }),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao ajustar saldo inicial")
            }

            await refreshBanks()
            toast.success("Saldo inicial atualizado com recálculo do saldo atual")
            setBalanceDialogOpen(false)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleToggleStatus() {
        if (!selectedBank) return

        try {
            setIsSubmitting(true)

            const response = await fetch("/api/financeiro/bancos", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedBank.id,
                    ativo: !selectedBank.ativo,
                }),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(result?.error ?? "Erro ao atualizar status da conta")
            }

            await refreshBanks()
            toast.success(selectedBank.ativo ? "Conta bancária desativada" : "Conta bancária ativada")
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
                    <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">Contas Bancárias</h1>
                    <p className="text-sm text-[#6f6556]">
                        {visibleBanks.length} conta{visibleBanks.length === 1 ? "" : "s"} na visualização atual
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={openCreateDialog}
                    className={cn(operationalListPrimaryButtonClass, "h-10 rounded-lg px-4 text-sm")}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Conta
                </Button>
            </section>

            <section className={cn(operationalListShellClass, "space-y-3 px-4 py-4 md:px-5")}>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7d69]" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nome, banco, agência ou conta"
                            className={operationalListSearchInputClass}
                        />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="min-w-[170px]">
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                                <SelectTrigger className={operationalListControlClass}>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="active">Ativas</SelectItem>
                                    <SelectItem value="inactive">Inativas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(search || statusFilter !== "all") ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setSearch("")
                                    setStatusFilter("all")
                                }}
                                className={cn("px-3 text-sm", operationalListGhostButtonClass)}
                            >
                                <X className="mr-1 size-4" />
                                Limpar filtros
                            </Button>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className={cn(operationalListShellClass)}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={operationalListTableHeadClass}>
                            <tr className={operationalListTableHeadRowClass}>
                                <th className={operationalListTableHeadCellClass}>Nome</th>
                                <th className={operationalListTableHeadCellClass}>Tipo</th>
                                <th className={operationalListTableHeadCellClass}>Banco</th>
                                <th className={operationalListTableHeadCellClass}>Agência / Conta</th>
                                <th className={cn(operationalListTableHeadCellClass, "text-right")}>Saldo Inicial</th>
                                <th className={cn(operationalListTableHeadCellClass, "text-right")}>Saldo Atual</th>
                                <th className={operationalListTableHeadCellClass}>Status</th>
                                <th className={cn(operationalListTableHeadCellClass, "text-right")}>Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE8DC]">
                            {visibleBanks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-14 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[#2C201B]/50">
                                            <Landmark className="size-10" />
                                            <div className="space-y-1">
                                                <p className="font-medium text-[#2C201B]">Nenhuma conta encontrada</p>
                                                <p className="text-sm">Ajuste os filtros ou cadastre uma nova conta bancária.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                visibleBanks.map((bank) => (
                                    <tr key={bank.id} className={operationalListTableRowClass}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 rounded-full border border-[#2C201B]/8"
                                                    style={{ backgroundColor: bank.cor ?? DEFAULT_COLOR }}
                                                    aria-hidden
                                                />
                                                <div className="space-y-1">
                                                    <p className="font-medium text-[#2C201B]">{bank.nome}</p>
                                                    <p className="text-xs text-[#2C201B]/52">
                                                        {bank.transactionCount ?? 0} movimentação(ões)
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[#2C201B]/72">{formatBankType(bank.tipo)}</td>
                                        <td className="px-4 py-3 text-[#2C201B]/72">{bank.banco || "—"}</td>
                                        <td className="px-4 py-3 text-[#2C201B]/72">{getAccountDescription(bank)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-[#2C201B]">
                                            {formatCurrency(bank.saldo_inicial ?? 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-[#393316]">
                                            {formatCurrency(bank.saldo_atual)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                                    bank.ativo
                                                        ? "border-[#393316]/16 bg-[#F2F5E7] text-[#393316]"
                                                        : "border-[#2C201B]/12 bg-[#F5F1E8] text-[#2C201B]/62"
                                                )}
                                            >
                                                {getStatusLabel(bank.ativo)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-[#2C201B]/62 hover:bg-[#FAF3E0] hover:text-[#2C201B]">
                                                        <MoreHorizontal className="size-4" />
                                                        <span className="sr-only">Abrir ações</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-52">
                                                    <DropdownMenuItem onClick={() => openEditDialog(bank)}>
                                                        <Pencil className="mr-2 size-4" />
                                                        Editar conta
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openBalanceDialog(bank)}>
                                                        <PiggyBank className="mr-2 size-4" />
                                                        Ajustar saldo inicial
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openStatusDialog(bank)}>
                                                        {bank.ativo ? (
                                                            <AlertTriangle className="mr-2 size-4" />
                                                        ) : (
                                                            <CheckCircle2 className="mr-2 size-4" />
                                                        )}
                                                        {bank.ativo ? "Desativar conta" : "Ativar conta"}
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
                <DialogContent className="border-[#2C201B]/10 bg-[#FFFCF7] sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editingBank ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle>
                        <DialogDescription>
                            {editingBank
                                ? "Atualize os dados cadastrais da conta. O saldo inicial é ajustado em uma ação separada."
                                : "Cadastre uma nova conta bancária para uso nas operações financeiras."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="bank-name">Nome</Label>
                            <Input
                                id="bank-name"
                                value={formState.nome}
                                onChange={(event) => updateForm("nome", event.target.value)}
                                placeholder="Ex.: Inter empresa"
                                className="border-[#2C201B]/10 bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank-type">Tipo</Label>
                            <Select value={formState.tipo} onValueChange={(value) => updateForm("tipo", value as TipoContaBancaria)}>
                                <SelectTrigger id="bank-type" className="border-[#2C201B]/10 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BANK_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {!editingBank ? (
                            <div className="space-y-2">
                                <Label htmlFor="bank-opening-balance">Saldo Inicial</Label>
                                <Input
                                    id="bank-opening-balance"
                                    type="number"
                                    step="0.01"
                                    value={formState.saldo_inicial}
                                    onChange={(event) => updateForm("saldo_inicial", event.target.value)}
                                    className="border-[#2C201B]/10 bg-white"
                                />
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="bank-bank">Banco</Label>
                            <Input
                                id="bank-bank"
                                value={formState.banco}
                                onChange={(event) => updateForm("banco", event.target.value)}
                                placeholder="Ex.: Inter"
                                className="border-[#2C201B]/10 bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank-agency">Agência</Label>
                            <Input
                                id="bank-agency"
                                value={formState.agencia}
                                onChange={(event) => updateForm("agencia", event.target.value)}
                                placeholder="Ex.: 0001"
                                className="border-[#2C201B]/10 bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank-account">Conta</Label>
                            <Input
                                id="bank-account"
                                value={formState.conta}
                                onChange={(event) => updateForm("conta", event.target.value)}
                                placeholder="Ex.: 12345-6"
                                className="border-[#2C201B]/10 bg-white"
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label>Cor da Conta</Label>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Input
                                    type="color"
                                    value={getColorInputValue(formState.cor)}
                                    onChange={(event) => updateForm("cor", event.target.value)}
                                    className="h-11 w-full border-[#2C201B]/10 bg-white p-1 sm:w-20"
                                />
                                <Input
                                    value={formState.cor}
                                    onChange={(event) => updateForm("cor", event.target.value)}
                                    placeholder="#F5D193"
                                    className="border-[#2C201B]/10 bg-white"
                                />
                                <Button type="button" variant="ghost" onClick={() => updateForm("cor", DEFAULT_COLOR)}>
                                    Usar cor padrão
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleSubmitForm} disabled={isSubmitting} className={cn(operationalListPrimaryButtonClass, "h-10 px-4")}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            {editingBank ? "Salvar alterações" : "Criar conta"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
                <DialogContent className="border-[#2C201B]/10 bg-[#FFFCF7] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Ajustar Saldo Inicial</DialogTitle>
                        <DialogDescription>
                            {selectedBank?.hasTransactions
                                ? "Esta conta já possui movimentações. O sistema recalculará o saldo atual a partir do novo saldo inicial e do histórico de lançamentos."
                                : "Atualize o saldo inicial da conta. Como não há movimentações, o saldo atual acompanhará o novo valor."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="rounded-2xl border border-[#F5D193]/55 bg-[#FAF3E0] p-4 text-sm text-[#2C201B]/78">
                            <p className="font-medium text-[#2C201B]">{selectedBank?.nome}</p>
                            <p className="mt-1">
                                Saldo atual antes do ajuste: <span className="font-semibold">{formatCurrency(selectedBank?.saldo_atual ?? 0)}</span>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="opening-balance">Novo saldo inicial</Label>
                            <Input
                                id="opening-balance"
                                type="number"
                                step="0.01"
                                value={balanceValue}
                                onChange={(event) => setBalanceValue(event.target.value)}
                                className="border-[#2C201B]/10 bg-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setBalanceDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleUpdateInitialBalance} disabled={isSubmitting} className={cn(operationalListPrimaryButtonClass, "h-10 px-4")}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            Salvar saldo inicial
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent className="border-[#2C201B]/10 bg-[#FFFCF7]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {selectedBank?.ativo ? "Desativar conta bancária?" : "Ativar conta bancária?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedBank?.ativo
                                ? "A conta ficará indisponível para novos lançamentos e seleções operacionais, mas o histórico será preservado."
                                : "A conta voltará a ficar disponível para uso nas operações financeiras."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleStatus} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                            {selectedBank?.ativo ? "Desativar" : "Ativar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
