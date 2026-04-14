"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Loader2, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { revertReceivable } from "@/actions/financeiro/receivables/revert"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { canEdit, canPay, formatCurrency, formatDateBR, getStatusColor, getStatusLabel, remaining } from "@/lib/financeiro-utils"
import { getTodayDateOnly, toDateOnlyValue } from "@/lib/date-only"
import { cn } from "@/lib/utils"
import type { CategoryOption, CentroCustoOption, ClientOption, ReceivableListItem } from "@/types/financeiro"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item?: ReceivableListItem | null
    categories: CategoryOption[]
    centrosCusto: CentroCustoOption[]
    clients: ClientOption[]
    onSuccess: () => Promise<void> | void
    onRequestReceive: (item: ReceivableListItem) => void
}

const statusDotClassName = {
    amber: "bg-amber-500",
    green: "bg-emerald-500",
    blue: "bg-sky-500",
    red: "bg-red-500",
    gray: "bg-stone-500",
} as const

const shellClassName =
    "sm:max-w-[760px] border border-[#e8e1d6] bg-white p-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"

const panelClassName = "rounded-xl border border-[#ece6db] bg-[#faf8f3]"
const fieldClassName =
    "h-9 rounded-lg border-[#d9d3c8] bg-white text-sm text-[#2c201b] shadow-none focus-visible:ring-[#393316]/15"
const labelClassName = "text-sm font-medium text-[#2c201b]"

function toInputDate(value?: string | null) {
    return toDateOnlyValue(value) ?? getTodayDateOnly()
}

function SummaryStat({
    label,
    value,
    valueClassName,
}: {
    label: string
    value: ReactNode
    valueClassName?: string
}) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">{label}</p>
            <div className={cn("text-sm font-semibold text-[#2c201b]", valueClassName)}>{value}</div>
        </div>
    )
}

export default function ReceivableEditorDialog({
    open,
    onOpenChange,
    item,
    categories,
    centrosCusto,
    clients,
    onSuccess,
    onRequestReceive,
}: Props) {
    const isEdit = Boolean(item)
    const isEditable = !item || canEdit(item.status)
    const [descricao, setDescricao] = useState("")
    const [valor, setValor] = useState<number | null>(null)
    const [dataEmissao, setDataEmissao] = useState("")
    const [dataVencimento, setDataVencimento] = useState("")
    const [primeiroVencimento, setPrimeiroVencimento] = useState("")
    const [clienteId, setClienteId] = useState("none")
    const [categoriaId, setCategoriaId] = useState("")
    const [centroCustoId, setCentroCustoId] = useState("none")
    const [observacoes, setObservacoes] = useState("")
    const [isInstallmentMode, setIsInstallmentMode] = useState(false)
    const [totalParcelas, setTotalParcelas] = useState("2")
    const [submitting, setSubmitting] = useState(false)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [lancamentos, setLancamentos] = useState<Array<{
        id: number
        valor: number
        valor_juros: number
        valor_desconto: number
        descricao: string | null
        data_lancamento: string
        conferencia_sessoes: { status: string } | null
    }>>([])
    const [revertingId, setRevertingId] = useState<number | null>(null)
    const [confirmRevertId, setConfirmRevertId] = useState<number | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!open) return

        const currentDueDate = toInputDate(item?.data_vencimento)
        setDescricao(item?.descricao ?? "")
        setValor(item ? Number(item.valor_total) : null)
        setDataEmissao(toInputDate(item?.data_emissao))
        setDataVencimento(currentDueDate)
        setPrimeiroVencimento(currentDueDate)
        setClienteId(item?.cliente?.id ? String(item.cliente.id) : "none")
        setCategoriaId(item?.categoria?.id ? String(item.categoria.id) : "")
        setCentroCustoId(item?.centro_custo?.id ? String(item.centro_custo.id) : "none")
        setObservacoes(item?.observacoes ?? "")
        setIsInstallmentMode(false)
        setTotalParcelas(item && item.total_parcelas > 1 ? String(item.total_parcelas) : "2")
    }, [open, item])

    // Load lancamentos when viewing a paid/partial bill
    useEffect(() => {
        if (!open || !item) return
        setHistoryOpen(false)
        setConfirmRevertId(null)
        setConfirmDelete(false)
        if (!canEdit(item.status)) {
            fetch(`/api/financeiro/receivables/${item.id}`)
                .then((r) => r.json())
                .then((data) => setLancamentos(data.lancamentos ?? []))
                .catch(() => setLancamentos([]))
        } else {
            setLancamentos([])
        }
    }, [open, item])

    const saldo = useMemo(() => (item ? remaining(item.valor_total, item.valor_recebido) : 0), [item])
    const clientItems = useMemo(
        () => [{ value: "none", label: "Sem cliente" }, ...clients.map((client) => ({ value: String(client.id), label: client.nome }))],
        [clients]
    )
    const categoryItems = useMemo(
        () => categories.map((category) => ({ value: String(category.id), label: category.nome })),
        [categories]
    )
    const centroCustoItems = useMemo(
        () => [{ value: "none", label: "Sem centro de custo" }, ...centrosCusto.map((centro) => ({ value: String(centro.id), label: centro.nome }))],
        [centrosCusto]
    )

    const canSubmit = useMemo(() => {
        if (!isEditable || !descricao.trim() || valor == null || valor <= 0 || !dataEmissao || !categoriaId) return false
        if (isEdit) return Boolean(dataVencimento)
        if (isInstallmentMode) return Number(totalParcelas) >= 2 && Boolean(primeiroVencimento)
        return Boolean(dataVencimento)
    }, [categoriaId, dataEmissao, dataVencimento, descricao, isEdit, isEditable, isInstallmentMode, primeiroVencimento, totalParcelas, valor])

    const statusColor = item ? statusDotClassName[getStatusColor(item.status)] : statusDotClassName.amber

    const canDelete = Boolean(
        item &&
        Number(item.valor_recebido) === 0 &&
        lancamentos.length === 0 &&
        canEdit(item.status)
    )

    async function handleSubmit() {
        if (!canSubmit) return
        setSubmitting(true)

        try {
            const isInstallmentCreation = !isEdit && isInstallmentMode
            const payload = isInstallmentCreation
                ? {
                    descricao: descricao.trim(),
                    valor_total: valor,
                    total_parcelas: Number(totalParcelas),
                    data_emissao: dataEmissao,
                    primeiro_vencimento: primeiroVencimento,
                    cliente_id: clienteId === "none" ? null : Number(clienteId),
                    categoria_id: Number(categoriaId),
                    centro_custo_id: centroCustoId === "none" ? null : Number(centroCustoId),
                    observacoes: observacoes.trim() || null,
                }
                : {
                    descricao: descricao.trim(),
                    valor,
                    data_emissao: dataEmissao,
                    data_vencimento: dataVencimento,
                    cliente_id: clienteId === "none" ? null : Number(clienteId),
                    categoria_id: Number(categoriaId),
                    centro_custo_id: centroCustoId === "none" ? null : Number(centroCustoId),
                    observacoes: observacoes.trim() || null,
                }

            const url = isEdit
                ? `/api/financeiro/receivables/${item!.id}`
                : isInstallmentCreation
                    ? "/api/financeiro/receivables/create-installments"
                    : "/api/financeiro/receivables/create"

            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao salvar conta")
            }

            toast.success(isEdit ? "Conta atualizada" : isInstallmentCreation ? "Contas parceladas criadas" : "Conta criada")
            onOpenChange(false)
            await onSuccess()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDelete() {
        if (!item || !confirmDelete) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/financeiro/receivables/${item.id}`, { method: "DELETE" })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao excluir conta")
            }
            toast.success("Conta excluída")
            onOpenChange(false)
            await onSuccess()
        } catch (error) {
            toast.error((error as Error).message)
            setConfirmDelete(false)
        } finally {
            setDeleting(false)
        }
    }

    async function handleRevert(lancamentoId: number) {
        setRevertingId(lancamentoId)
        try {
            await revertReceivable(lancamentoId)
            toast.success("Recebimento estornado")
            setConfirmRevertId(null)
            const data = await fetch(`/api/financeiro/receivables/${item!.id}`).then((r) => r.json())
            setLancamentos(data.lancamentos ?? [])
            await onSuccess()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setRevertingId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className={shellClassName}>
                <div className="flex max-h-[90vh] flex-col">
                    <div className="flex items-start justify-between border-b border-[#e7e0d4] px-5 py-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">
                                {isEdit ? "Conta a receber" : "Nova conta a receber"}
                            </h2>
                            <p className="text-sm text-[#6f6556]">
                                {isEdit ? "Atualize os dados do lançamento financeiro." : "Cadastre a conta manualmente."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            aria-label="Fechar modal"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7b705f] transition-colors hover:border hover:border-[#ddd7cc] hover:bg-[#f4efe4] hover:text-[#2c201b]"
                        >
                            <X className="size-4" />
                            <span className="sr-only">Fechar modal</span>
                        </button>
                    </div>

                    <div className="space-y-4 overflow-y-auto px-5 py-4">
                        <div className={cn(panelClassName, "px-4 py-3")}>
                            <div className="grid gap-3 md:grid-cols-4">
                                <SummaryStat
                                    label="Status"
                                    value={
                                        <div className="flex items-center gap-2">
                                            <span className={cn("size-2 rounded-full", statusColor)} />
                                            <span>{item ? getStatusLabel(item.status) : "Novo registro"}</span>
                                        </div>
                                    }
                                />
                                <SummaryStat label="Saldo" value={formatCurrency(item ? saldo : valor ?? 0)} valueClassName="tabular-nums" />
                                <SummaryStat
                                    label="Vencimento"
                                    value={formatDateBR(isInstallmentMode && !isEdit ? primeiroVencimento : dataVencimento)}
                                    valueClassName="tabular-nums"
                                />
                                <SummaryStat
                                    label="Parcela"
                                    value={item ? `${item.parcela_atual}/${item.total_parcelas}` : isInstallmentMode ? `1/${totalParcelas}` : "1/1"}
                                    valueClassName="tabular-nums"
                                />
                            </div>
                        </div>

                        {item?.total_parcelas && item.total_parcelas > 1 ? (
                            <div className="rounded-lg border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2 text-sm text-[#6f6556]">
                                Esta edição afeta apenas a parcela atual da série.
                            </div>
                        ) : null}

                        {item && !isEditable ? (
                            <div className="rounded-lg border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2 text-sm text-[#6f6556]">
                                Conta encerrada em modo leitura. Para alterar, ajuste o status no fluxo apropriado.
                            </div>
                        ) : null}

                        {/* Payment history — shown when conta is PAGO or PARCIAL */}
                        {item && !isEditable && lancamentos.length > 0 ? (
                            <div className="rounded-xl border border-[#ece6db] bg-[#faf8f3]">
                                <button
                                    type="button"
                                    onClick={() => setHistoryOpen((v) => !v)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[#2c201b] hover:bg-[#f3efe6]/60"
                                >
                                    <span>Histórico de recebimentos ({lancamentos.length})</span>
                                    <ChevronDown className={cn("size-4 text-[#8a7d69] transition-transform", historyOpen && "rotate-180")} />
                                </button>
                                {historyOpen ? (
                                    <div className="divide-y divide-[#ece6db] border-t border-[#ece6db]">
                                        {lancamentos.map((lancamento) => {
                                            const isLocked = lancamento.conferencia_sessoes?.status === "LOCKED"
                                            const isReverting = revertingId === lancamento.id
                                            const isConfirming = confirmRevertId === lancamento.id
                                            return (
                                                <div key={lancamento.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium tabular-nums text-[#2c201b]">
                                                            {formatCurrency(Number(lancamento.valor))}
                                                            {Number(lancamento.valor_juros) > 0 && (
                                                                <span className="ml-1.5 text-xs font-normal text-[#8a7d69]">+{formatCurrency(Number(lancamento.valor_juros))} juros</span>
                                                            )}
                                                            {Number(lancamento.valor_desconto) > 0 && (
                                                                <span className="ml-1.5 text-xs font-normal text-emerald-600">-{formatCurrency(Number(lancamento.valor_desconto))} desc.</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-[#8a7d69]">
                                                            {formatDateBR(lancamento.data_lancamento)}
                                                            {lancamento.descricao ? ` · ${lancamento.descricao}` : ""}
                                                            {isLocked ? " · 🔒 Conferência" : ""}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        {isConfirming ? (
                                                            <>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setConfirmRevertId(null)}
                                                                    disabled={isReverting}
                                                                    className="h-7 rounded-md px-2 text-xs text-[#6f6556]"
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() => handleRevert(lancamento.id)}
                                                                    disabled={isReverting}
                                                                    className="h-7 rounded-md bg-[#8F3F37] px-2 text-xs text-white hover:bg-[#7a332c]"
                                                                >
                                                                    {isReverting ? <Loader2 className="size-3 animate-spin" /> : "Confirmar estorno"}
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => !isLocked && setConfirmRevertId(lancamento.id)}
                                                                disabled={isLocked || isReverting}
                                                                title={isLocked ? "Bloqueado por conferência" : "Estornar este recebimento"}
                                                                className="h-7 rounded-md px-2 text-xs text-[#8F3F37] hover:bg-[#fef2f2] disabled:opacity-40"
                                                            >
                                                                Estornar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {!isEdit ? (
                            <div className={cn(panelClassName, "space-y-3 px-4 py-3")}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-[#2c201b]">Criar como parcelada</p>
                                        <p className="text-sm text-[#6f6556]">Ative apenas quando precisar gerar mais de uma parcela.</p>
                                    </div>
                                    <Switch checked={isInstallmentMode} onCheckedChange={setIsInstallmentMode} disabled={submitting} />
                                </div>

                                {isInstallmentMode ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className={labelClassName}>Total de parcelas</Label>
                                            <Input
                                                type="number"
                                                min="2"
                                                max="36"
                                                value={totalParcelas}
                                                onChange={(event) => setTotalParcelas(event.target.value)}
                                                className={cn(fieldClassName, "tabular-nums")}
                                                disabled={submitting}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className={labelClassName}>Primeiro vencimento</Label>
                                            <Input
                                                type="date"
                                                value={primeiroVencimento}
                                                onChange={(event) => setPrimeiroVencimento(event.target.value)}
                                                className={cn(fieldClassName, "tabular-nums")}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5 md:col-span-2">
                                <Label className={labelClassName}>Descrição</Label>
                                <Input
                                    value={descricao}
                                    onChange={(event) => setDescricao(event.target.value)}
                                    className={fieldClassName}
                                    disabled={!isEditable || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>Cliente</Label>
                                <SearchableSelect
                                    value={clienteId}
                                    onValueChange={setClienteId}
                                    items={clientItems}
                                    placeholder="Selecionar cliente"
                                    searchPlaceholder="Buscar cliente"
                                    className="h-9 rounded-lg border-[#d9d3c8] text-sm text-[#2c201b] shadow-none"
                                    disabled={!isEditable || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>Categoria</Label>
                                <SearchableSelect
                                    value={categoriaId}
                                    onValueChange={setCategoriaId}
                                    items={categoryItems}
                                    placeholder="Selecionar categoria"
                                    searchPlaceholder="Buscar categoria"
                                    className="h-9 rounded-lg border-[#d9d3c8] text-sm text-[#2c201b] shadow-none"
                                    disabled={!isEditable || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>Valor total</Label>
                                <MoneyInput
                                    value={valor}
                                    onValueChange={setValor}
                                    placeholder="R$ 0,00"
                                    className={cn(fieldClassName, "tabular-nums")}
                                    disabled={!isEditable || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>Centro de custo</Label>
                                <SearchableSelect
                                    value={centroCustoId}
                                    onValueChange={setCentroCustoId}
                                    items={centroCustoItems}
                                    placeholder="Selecionar centro de custo"
                                    searchPlaceholder="Buscar centro de custo"
                                    className="h-9 rounded-lg border-[#d9d3c8] text-sm text-[#2c201b] shadow-none"
                                    disabled={!isEditable || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>Data de emissão</Label>
                                <Input
                                    type="date"
                                    value={dataEmissao}
                                    onChange={(event) => setDataEmissao(event.target.value)}
                                    className={cn(fieldClassName, "tabular-nums")}
                                    disabled={!isEditable || submitting}
                                />
                            </div>

                            {isEdit || !isInstallmentMode ? (
                                <div className="space-y-1.5">
                                    <Label className={labelClassName}>Vencimento</Label>
                                    <Input
                                        type="date"
                                        value={dataVencimento}
                                        onChange={(event) => setDataVencimento(event.target.value)}
                                        className={cn(fieldClassName, "tabular-nums")}
                                        disabled={!isEditable || submitting}
                                    />
                                </div>
                            ) : null}

                            <div className="space-y-1.5 md:col-span-2">
                                <Label className={labelClassName}>Observações</Label>
                                <Textarea
                                    value={observacoes}
                                    onChange={(event) => setObservacoes(event.target.value)}
                                    rows={4}
                                    placeholder="Observações internas do lançamento"
                                    className="rounded-lg border-[#d9d3c8] bg-white text-sm text-[#2c201b] shadow-none focus-visible:ring-[#393316]/15"
                                    disabled={!isEditable || submitting}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-[#e7e0d4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Left: delete action */}
                        <div>
                            {canDelete ? (
                                confirmDelete ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#8F3F37]">Excluir permanentemente?</span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setConfirmDelete(false)}
                                            disabled={deleting}
                                            className="h-7 rounded-md px-2 text-xs text-[#6f6556]"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="h-7 rounded-md bg-[#8F3F37] px-2 text-xs text-white hover:bg-[#7a332c]"
                                        >
                                            {deleting ? <Loader2 className="size-3 animate-spin" /> : "Excluir"}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setConfirmDelete(true)}
                                        disabled={submitting}
                                        className="h-9 gap-1.5 rounded-lg px-3 text-[#8F3F37] shadow-none hover:bg-[#fef2f2] hover:text-[#7a332c]"
                                    >
                                        <Trash2 className="size-4" />
                                        Excluir conta
                                    </Button>
                                )
                            ) : null}
                        </div>

                        {/* Right: cancel / receive / save */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            className="h-9 rounded-lg px-3 text-[#6f6556] shadow-none hover:bg-[#f3efe6] hover:text-[#2c201b]"
                        >
                            Cancelar
                        </Button>

                        {item && canPay(item.status) ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onRequestReceive(item)}
                                className="h-9 rounded-lg border border-[#ddd7cc] bg-[#f7f4ec] text-[#393316] hover:bg-[#f1ecdf]"
                            >
                                Registrar recebimento
                            </Button>
                        ) : null}

                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit || submitting}
                            className="h-10 rounded-lg bg-[#393316] px-4 text-sm text-[#faf3e0] hover:bg-[#2f2a13] focus-visible:ring-[#393316]/20"
                        >
                            {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</> : isEdit ? "Salvar alterações" : "Criar conta"}
                        </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
