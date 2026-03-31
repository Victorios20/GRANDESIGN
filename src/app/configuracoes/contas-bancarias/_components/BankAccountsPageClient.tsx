"use client"

import { useMemo, useState, type ComponentType } from "react"
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
    Wallet,
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

type BankSummaryCardProps = {
    label: string
    value: string
    icon: ComponentType<{ className?: string }>
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

function BankSummaryCard({ label, value, icon: Icon }: BankSummaryCardProps) {
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

export default function BankAccountsPageClient({ initialBanks }: Props) {
    const [banks, setBanks] = useState(initialBanks)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [isFetching, setIsFetching] = useState(false)
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
            setIsFetching(true)
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
        } finally {
            setIsFetching(false)
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

    const summary = useMemo(() => {
        return visibleBanks.reduce(
            (accumulator, bank) => {
                accumulator.total += 1
                accumulator.active += bank.ativo ? 1 : 0
                accumulator.openingBalance += Number(bank.saldo_inicial ?? 0)
                accumulator.currentBalance += Number(bank.saldo_atual ?? 0)
                return accumulator
            },
            {
                total: 0,
                active: 0,
                openingBalance: 0,
                currentBalance: 0,
            }
        )
    }, [visibleBanks])

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
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#2C201B]/10 bg-[#FFFCF7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2C201B]/52">
                        <Landmark className="size-3.5" />
                        Configurações Financeiras
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#2C201B]">
                            Contas Bancárias
                        </h1>
                        <p className="mt-1 text-sm text-[#2C201B]/62">
                            Gerencie contas, ajuste saldo inicial com recálculo automático e controle quais contas seguem ativas na operação.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={refreshBanks} disabled={isFetching}>
                        {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
                        Atualizar
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <Plus className="size-4" />
                        Nova Conta
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <BankSummaryCard label="Total de contas" value={String(summary.total)} icon={Wallet} />
                <BankSummaryCard label="Contas ativas" value={String(summary.active)} icon={CheckCircle2} />
                <BankSummaryCard label="Saldo inicial" value={formatCurrency(summary.openingBalance)} icon={PiggyBank} />
                <BankSummaryCard label="Saldo atual" value={formatCurrency(summary.currentBalance)} icon={Landmark} />
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
                                placeholder="Buscar por nome, banco, agência ou conta"
                                className="h-11 border-[#2C201B]/10 bg-white pl-9"
                            />
                        </div>

                        <div className="w-full lg:w-56">
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

            <Card className="overflow-hidden border border-[rgba(44,32,27,0.08)] bg-[#FFFCF7]">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#2C201B]/8 hover:bg-transparent">
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Nome</TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Tipo</TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Banco</TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Agência / Conta</TableHead>
                                <TableHead className="h-12 px-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Saldo Inicial</TableHead>
                                <TableHead className="h-12 px-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Saldo Atual</TableHead>
                                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Status</TableHead>
                                <TableHead className="h-12 px-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/48">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleBanks.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={8} className="px-4 py-14 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[#2C201B]/50">
                                            <Landmark className="size-10" />
                                            <div className="space-y-1">
                                                <p className="font-medium text-[#2C201B]">Nenhuma conta encontrada</p>
                                                <p className="text-sm">Ajuste os filtros ou cadastre uma nova conta bancária.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleBanks.map((bank) => (
                                    <TableRow key={bank.id} className="border-[#2C201B]/6 bg-white/70 hover:bg-[#FAF3E0]/35">
                                        <TableCell className="px-4 py-3">
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
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-[#2C201B]/72">
                                            {formatBankType(bank.tipo)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-[#2C201B]/72">
                                            {bank.banco || "—"}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-[#2C201B]/72">
                                            {getAccountDescription(bank)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right font-medium text-[#2C201B]">
                                            {formatCurrency(bank.saldo_inicial ?? 0)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right font-medium text-[#393316]">
                                            {formatCurrency(bank.saldo_atual)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                                                    bank.ativo
                                                        ? "border-[#393316]/16 bg-[#F2F5E7] text-[#393316]"
                                                        : "border-[#2C201B]/12 bg-[#F5F1E8] text-[#2C201B]/62"
                                                )}
                                            >
                                                {getStatusLabel(bank.ativo)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right">
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
                        <Button type="button" onClick={handleSubmitForm} disabled={isSubmitting}>
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
                        <Button type="button" onClick={handleUpdateInitialBalance} disabled={isSubmitting}>
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
