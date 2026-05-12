"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2, LockKeyhole, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
    operationalListControlClass,
    operationalListGhostButtonClass,
    operationalListIconButtonClass,
    operationalListMutedButtonClass,
    operationalListPrimaryButtonClass,
    operationalListShellClass,
    operationalListSubtlePanelClass,
} from "@/components/ui/operational-list-styles"
import { Textarea } from "@/components/ui/textarea"
import { isTransactionSelectableCategory } from "@/lib/financial/fixed-category-taxonomy"
import { formatCurrency, formatDateBR } from "@/lib/financeiro-utils"
import { getTodayDateOnly, parseDateOnlyInput, toDateOnlyValue } from "@/lib/date-only"
import { cn } from "@/lib/utils"
import type {
    BankOption,
    CashFlowSettings,
    CategoryOption,
    CentroCustoOption,
    TransactionListItem,
} from "@/types/financeiro"

type TransactionFormMode = "RECEITA" | "DESPESA" | "TRANSFERENCIA"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item?: TransactionListItem | null
    banks: BankOption[]
    categories: CategoryOption[]
    centrosCusto: CentroCustoOption[]
    conferenceMode?: boolean
    closingDate?: CashFlowSettings["closing_date"]
    reopenPeriodHref?: string
    isAdmin?: boolean
    onSuccess: () => Promise<void> | void
}

const shellClassName = cn("sm:max-w-[760px] p-0", operationalListShellClass)

const panelClassName = operationalListSubtlePanelClass
const fieldClassName = operationalListControlClass
const labelClassName = "text-sm font-medium text-[#2c201b]"

function toInputDate(value?: string | null) {
    return toDateOnlyValue(value) ?? getTodayDateOnly()
}

function isClosedByFinancialPeriod(dateValue: string, closingDate?: string | null) {
    if (!dateValue || !closingDate) return false
    const date = parseDateOnlyInput(dateValue)
    const closing = parseDateOnlyInput(closingDate)
    if (!date || !closing) return false
    return date.getTime() <= closing.getTime()
}

function getConferenceLabel(item: TransactionListItem) {
    if (item.status_conferencia === "CONFERIDO") return "Conferido"
    if (item.status_conferencia === "PENDENCIA") return "Com pendência"
    return "Pendente"
}

function parsePositiveDecimal(value: string) {
    const normalized = value.trim().replace(",", ".")
    if (!normalized) return null

    const parsed = Number(normalized)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function getOriginMeta(item: TransactionListItem) {
    if (item.conta_pagar) {
        return {
            label: "Conta a Pagar",
            href: `/contas-pagar?search=${encodeURIComponent(item.conta_pagar.descricao)}`,
        }
    }

    if (item.conta_receber) {
        return {
            label: "Conta a Receber",
            href: `/contas-receber?search=${encodeURIComponent(item.conta_receber.descricao)}`,
        }
    }

    if (item.transferencia) {
        return {
            label: `Transferência #${item.transferencia.id}`,
            href: null,
        }
    }

    return null
}

export default function TransactionEditorDialog({
    open,
    onOpenChange,
    item,
    banks,
    categories,
    centrosCusto,
    conferenceMode = false,
    closingDate = null,
    reopenPeriodHref = "/configuracoes/parametrizacoes",
    isAdmin = false,
    onSuccess,
}: Props) {
    const isCreateMode = !item
    const [descricao, setDescricao] = useState("")
    const [valor, setValor] = useState<number | null>(null)
    const [recebimentoCartao, setRecebimentoCartao] = useState(false)
    const [taxaCartaoValor, setTaxaCartaoValor] = useState<number | null>(null)
    const [taxaCartaoPercentual, setTaxaCartaoPercentual] = useState("")
    const [tipo, setTipo] = useState<TransactionFormMode>("DESPESA")
    const [dataLancamento, setDataLancamento] = useState("")
    const [dataCompetencia, setDataCompetencia] = useState("")
    const [contaBancariaId, setContaBancariaId] = useState("")
    const [contaDestinoId, setContaDestinoId] = useState("")
    const [categoriaId, setCategoriaId] = useState("")
    const [centroCustoId, setCentroCustoId] = useState("none")
    const [observacoes, setObservacoes] = useState("")
    const [justificativa, setJustificativa] = useState("")
    const [confirmLinkedDelete, setConfirmLinkedDelete] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return

        if (item) {
            setDescricao(item.descricao)
            setValor(Number(item.valor))
            setRecebimentoCartao(false)
            setTaxaCartaoValor(null)
            setTaxaCartaoPercentual("")
            setTipo(item.tipo)
            setDataLancamento(toInputDate(item.data_lancamento))
            setDataCompetencia(toInputDate(item.data_competencia))
            setContaBancariaId(item.conta_bancaria?.id ? String(item.conta_bancaria.id) : "")
            setContaDestinoId("")
            setCategoriaId(String(item.categoria.id))
            setCentroCustoId(item.centro_custo?.id ? String(item.centro_custo.id) : "none")
            setObservacoes(item.observacoes ?? "")
            setJustificativa("")
            return
        }

        const defaultBank = banks.find((bank) => bank.ativo)
        const defaultDate = toInputDate()

        setDescricao("")
        setValor(null)
        setRecebimentoCartao(false)
        setTaxaCartaoValor(null)
        setTaxaCartaoPercentual("")
        setTipo("DESPESA")
        setDataLancamento(defaultDate)
        setDataCompetencia(defaultDate)
        setContaBancariaId(defaultBank ? String(defaultBank.id) : "")
        setContaDestinoId("")
        setCategoriaId("")
        setCentroCustoId("none")
        setObservacoes("")
        setJustificativa("")
        setConfirmLinkedDelete(false)
    }, [banks, item, open])

    const originMeta = item ? getOriginMeta(item) : null
    const isTransferMode = isCreateMode && tipo === "TRANSFERENCIA"
    const sessionLocked = item?.conferencia_sessoes?.status === "LOCKED"
    const effectiveDate = isTransferMode ? dataLancamento : dataCompetencia || dataLancamento
    const isClosedPeriod = isClosedByFinancialPeriod(effectiveDate, closingDate)

    const canEditDirectly = Boolean(item && !originMeta && item.status_conferencia !== "CONFERIDO" && !sessionLocked && !isClosedPeriod)
    const canAdjust = Boolean(item && !originMeta && item.status_conferencia === "CONFERIDO" && !sessionLocked && !isClosedPeriod)
    const canCreate = isCreateMode && !isClosedPeriod
    const canConfigureCardFee = canCreate && tipo === "RECEITA"
    const parsedTaxaCartaoPercentual = parsePositiveDecimal(taxaCartaoPercentual)
    const taxaCartaoCalculada = recebimentoCartao
        ? Number(taxaCartaoValor ?? 0) > 0
            ? Number(taxaCartaoValor)
            : valor != null && parsedTaxaCartaoPercentual
                ? Math.round(valor * (parsedTaxaCartaoPercentual / 100) * 100) / 100
                : 0
        : 0
    const taxaCartaoInvalida = Boolean(canConfigureCardFee && recebimentoCartao && valor != null && taxaCartaoCalculada >= valor)
    const valorLiquidoCartao = valor != null ? Math.max(valor - taxaCartaoCalculada, 0) : null

    const accountItems = useMemo(
        () => banks.filter((bank) => bank.ativo).map((bank) => ({ value: String(bank.id), label: bank.nome })),
        [banks]
    )

    const categoryItems = useMemo(
        () =>
            categories
                .filter((category) => isTransactionSelectableCategory(category, tipo === "TRANSFERENCIA" ? "DESPESA" : tipo))
                .map((category) => ({ value: String(category.id), label: category.nome })),
        [categories, tipo]
    )

    const centroCustoItems = useMemo(
        () => [{ value: "none", label: "Sem centro de custo" }, ...centrosCusto.map((centro) => ({ value: String(centro.id), label: centro.nome }))],
        [centrosCusto]
    )

    const tipoItems = useMemo(() => {
        const items = [
            { value: "RECEITA", label: "Receita" },
            { value: "DESPESA", label: "Despesa" },
        ]

        if (isCreateMode) {
            items.push({ value: "TRANSFERENCIA", label: "Transferência" })
        }

        return items
    }, [isCreateMode])

    const canSubmit = Boolean(
        (canCreate || canEditDirectly || canAdjust) &&
            descricao.trim() &&
            valor != null &&
            valor > 0 &&
            dataLancamento &&
            contaBancariaId &&
            (isTransferMode
                ? contaDestinoId && contaDestinoId !== contaBancariaId
                : dataCompetencia && categoriaId) &&
            !taxaCartaoInvalida
    )

    async function handleSave() {
        if (!canSubmit) return

        setSubmitting(true)

        try {
            const transferPayload = {
                descricao: descricao.trim(),
                valor,
                data_transferencia: dataLancamento,
                conta_origem_id: Number(contaBancariaId),
                conta_destino_id: Number(contaDestinoId),
                observacoes: observacoes.trim() || undefined,
            }

            const payload = {
                descricao: descricao.trim(),
                valor,
                tipo: tipo === "TRANSFERENCIA" ? "DESPESA" : tipo,
                data_lancamento: dataLancamento,
                data_competencia: dataCompetencia,
                conta_bancaria_id: Number(contaBancariaId),
                categoria_id: Number(categoriaId),
                centro_custo_id: centroCustoId === "none" ? null : Number(centroCustoId),
                observacoes: observacoes.trim() || undefined,
                reason: justificativa.trim() || null,
                ...(canConfigureCardFee && recebimentoCartao
                    ? {
                        taxa_cartao_valor: taxaCartaoValor && taxaCartaoValor > 0 ? taxaCartaoValor : undefined,
                        taxa_cartao_percentual: parsedTaxaCartaoPercentual ?? undefined,
                    }
                    : {}),
            }

            const endpoint = isTransferMode
                ? "/api/financeiro/transfers"
                : isCreateMode
                ? "/api/financeiro/transactions"
                : canAdjust
                    ? `/api/financeiro/transactions/${item!.id}/adjust`
                    : `/api/financeiro/transactions/${item!.id}`
            const method = isCreateMode ? "POST" : canAdjust ? "POST" : "PATCH"

            const response = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isTransferMode ? transferPayload : payload),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao salvar lançamento")
            }

            toast.success(
                isTransferMode
                    ? "Transferência criada com saída e entrada sincronizadas"
                    : isCreateMode
                    ? "Transação incluída"
                    : canAdjust
                        ? "Ajuste registrado"
                        : "Lançamento atualizado"
            )
            onOpenChange(false)
            await onSuccess()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    async function handleReverse() {
        if (!item) return

        const confirmed = window.confirm("Confirmar estorno deste lançamento?")
        if (!confirmed) return

        setSubmitting(true)

        try {
            const response = await fetch(`/api/financeiro/transactions/${item.id}/reverse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: justificativa.trim() || null }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao estornar lançamento")
            }

            toast.success("Estorno registrado")
            onOpenChange(false)
            await onSuccess()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDelete() {
        if (!item || !isAdmin) return

        if (originMeta && !confirmLinkedDelete) {
            toast.error("Você precisa confirmar a exclusão de lançamentos vinculados.")
            return
        }

        const confirmed = window.confirm("ATENÇÃO: A exclusão de um lançamento é IRREVERSÍVEL. Um snapshot será gerado para auditoria.\n\nTem certeza que deseja excluir?")
        if (!confirmed) return

        setSubmitting(true)

        try {
            const response = await fetch(`/api/financeiro/transactions/${item.id}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao excluir lançamento")
            }

            toast.success("Lançamento excluído com sucesso")
            onOpenChange(false)
            await onSuccess()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className={shellClassName}>
                <div className="flex max-h-[90vh] flex-col">
                    <div className="flex items-start justify-between border-b border-[#e7e0d4] px-5 py-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">
                                {isCreateMode ? "Incluir transação" : `Lançamento #${item.id}`}
                            </h2>
                            <p className="text-sm text-[#6f6556]">
                                {isCreateMode
                                    ? isTransferMode
                                        ? "Transfira valores entre contas mantendo a saída e a entrada sincronizadas."
                                        : "Registre uma nova movimentação financeira no caixa."
                                    : canAdjust
                                        ? "Use ajuste ou estorno para corrigir um lançamento já conferido."
                                        : canEditDirectly
                                            ? "Edite o lançamento diretamente enquanto ele ainda estiver aberto para alteração."
                                            : "Consulte a origem e as restrições operacionais deste lançamento."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            aria-label="Fechar modal"
                            className={operationalListIconButtonClass}
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="space-y-4 overflow-y-auto px-5 py-4">
                        {!isCreateMode && item ? (
                            <div className={cn(panelClassName, "grid gap-3 px-4 py-3 md:grid-cols-4")}>
                                <SummaryStat label="Conta" value={item.conta_bancaria?.nome ?? "Não definida"} />
                                <SummaryStat label="Conciliação" value={getConferenceLabel(item)} />
                                <SummaryStat label="Lançamento" value={formatDateBR(item.data_lancamento)} />
                                <SummaryStat label="Valor" value={formatCurrency(item.valor)} valueClassName="tabular-nums" />
                            </div>
                        ) : null}

                        {!isCreateMode && item?.pendencia_motivo ? (
                            <div className="rounded-lg border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2 text-sm text-[#6f6556]">
                                Pendência registrada: {item.pendencia_motivo}
                            </div>
                        ) : null}

                        {sessionLocked ? (
                            <div className="flex items-start gap-2 rounded-lg border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2 text-sm text-[#6f6556]">
                                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#7b705f]" />
                                <span>Revisão encerrada. Reabra a revisão para corrigir este lançamento.</span>
                            </div>
                        ) : null}

                        {isClosedPeriod ? (
                            <div className="flex items-start gap-2 rounded-lg border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2 text-sm text-[#6f6556]">
                                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#7b705f]" />
                                <div className="space-y-2">
                                    <p className="font-medium text-[#2c201b]">Período financeiro fechado</p>
                                    <Link
                                        href={reopenPeriodHref}
                                        onClick={() => onOpenChange(false)}
                                        className="inline-flex text-sm font-medium text-[#393316] underline-offset-2 hover:underline"
                                    >
                                        Reabrir período para editar
                                    </Link>
                                </div>
                            </div>
                        ) : null}

                        {originMeta ? (
                            <div className="flex items-start gap-2 rounded-lg border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2 text-sm text-[#6f6556]">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#7b705f]" />
                                <div className="space-y-2">
                                    <p>Este lançamento deve ser editado na origem</p>
                                    {originMeta.href ? (
                                        <Link
                                            href={originMeta.href}
                                            onClick={() => onOpenChange(false)}
                                            className="inline-flex text-sm font-medium text-[#393316] underline-offset-2 hover:underline"
                                        >
                                            Abrir origem
                                        </Link>
                                    ) : null}
                                    {conferenceMode ? (
                                        <button
                                            type="button"
                                            onClick={() => onOpenChange(false)}
                                            className="inline-flex text-sm font-medium text-[#6f6556] underline-offset-2 hover:text-[#2c201b] hover:underline"
                                        >
                                            Voltar para a conferência
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        {isTransferMode ? (
                            <div className="flex items-start gap-2 rounded-lg border border-[#d9e2d1] bg-[#fbfdf9] px-3 py-2 text-sm text-[#4f6f45]">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#4f6f45]" />
                                <p>
                                    A transferência cria automaticamente duas transações sincronizadas: uma saída na conta de origem e uma entrada na conta de destino.
                                </p>
                            </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5 md:col-span-2">
                                <Label className={labelClassName}>Descrição</Label>
                                <Input
                                    value={descricao}
                                    onChange={(event) => setDescricao(event.target.value)}
                                    className={fieldClassName}
                                    disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>Tipo</Label>
                                <SearchableSelect
                                    value={tipo}
                                    onValueChange={(val) => {
                                        const nextTipo = val as TransactionFormMode
                                        setTipo(nextTipo)
                                        setCategoriaId("")
                                        if (nextTipo !== "RECEITA") {
                                            setRecebimentoCartao(false)
                                            setTaxaCartaoValor(null)
                                            setTaxaCartaoPercentual("")
                                        }
                                        if (nextTipo === "TRANSFERENCIA") {
                                            setCentroCustoId("none")
                                            setDataCompetencia(dataLancamento)
                                        }
                                    }}
                                    items={tipoItems}
                                    placeholder="Selecionar tipo"
                                    searchPlaceholder="Buscar tipo"
                                    className={fieldClassName}
                                    disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>Valor</Label>
                                <MoneyInput
                                    value={valor}
                                    onValueChange={setValor}
                                    className={cn(fieldClassName, "tabular-nums")}
                                    disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>{isTransferMode ? "Conta origem" : "Conta bancária"}</Label>
                                <SearchableSelect
                                    value={contaBancariaId}
                                    onValueChange={setContaBancariaId}
                                    items={accountItems}
                                    placeholder={isTransferMode ? "Selecionar origem" : "Selecionar conta"}
                                    searchPlaceholder="Buscar conta"
                                    className={fieldClassName}
                                    disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                />
                            </div>

                            {isTransferMode ? (
                                <div className="space-y-1.5">
                                    <Label className={labelClassName}>Conta destino</Label>
                                    <SearchableSelect
                                        value={contaDestinoId}
                                        onValueChange={setContaDestinoId}
                                        items={accountItems}
                                        placeholder="Selecionar destino"
                                        searchPlaceholder="Buscar conta"
                                        className={fieldClassName}
                                        disabled={!canCreate || submitting}
                                    />
                                    {contaBancariaId && contaDestinoId && contaBancariaId === contaDestinoId ? (
                                        <p className="text-xs text-[#B42318]">Origem e destino devem ser diferentes.</p>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <Label className={labelClassName}>Categoria</Label>
                                    <SearchableSelect
                                        value={categoriaId}
                                        onValueChange={setCategoriaId}
                                        items={categoryItems}
                                        placeholder="Selecionar categoria"
                                        searchPlaceholder="Buscar categoria"
                                        className={fieldClassName}
                                        disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className={labelClassName}>{isTransferMode ? "Data da transferência" : "Data de lançamento"}</Label>
                                <Input
                                    type="date"
                                    value={dataLancamento}
                                    onChange={(event) => {
                                        setDataLancamento(event.target.value)
                                        if (isTransferMode) setDataCompetencia(event.target.value)
                                    }}
                                    className={cn(fieldClassName, "tabular-nums")}
                                    disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                />
                            </div>

                            {!isTransferMode ? (
                                <div className="space-y-1.5">
                                    <Label className={labelClassName}>Data de competência</Label>
                                    <Input
                                        type="date"
                                        value={dataCompetencia}
                                        onChange={(event) => setDataCompetencia(event.target.value)}
                                        className={cn(fieldClassName, "tabular-nums")}
                                        disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                    />
                                </div>
                            ) : null}

                            {canConfigureCardFee ? (
                                <div className="space-y-3 rounded-xl border border-[#e7e0d4] bg-[#faf8f4] p-3 md:col-span-2">
                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="recebimentoCartao"
                                            checked={recebimentoCartao}
                                            onCheckedChange={(checked) => setRecebimentoCartao(Boolean(checked))}
                                            disabled={submitting}
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="recebimentoCartao" className="text-sm font-semibold text-[#2c201b]">
                                                Recebimento via cartao
                                            </Label>
                                            <p className="text-xs text-[#6f6556]">
                                                O sistema registra a taxa como uma despesa vinculada a esta receita.
                                            </p>
                                        </div>
                                    </div>

                                    {recebimentoCartao ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label className={labelClassName}>Taxa de cartao (R$)</Label>
                                                <MoneyInput
                                                    value={taxaCartaoValor}
                                                    onValueChange={setTaxaCartaoValor}
                                                    className={cn(fieldClassName, "tabular-nums")}
                                                    disabled={submitting}
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className={labelClassName}>Taxa de cartao (%)</Label>
                                                <Input
                                                    value={taxaCartaoPercentual}
                                                    onChange={(event) => setTaxaCartaoPercentual(event.target.value.replace(/[^\d.,]/g, ""))}
                                                    inputMode="decimal"
                                                    placeholder="Ex: 3,49"
                                                    className={cn(fieldClassName, "tabular-nums")}
                                                    disabled={submitting}
                                                />
                                            </div>

                                            <div className="rounded-lg border border-[#ddd7cc] bg-white px-3 py-2 text-xs text-[#6f6556] md:col-span-2">
                                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                    <span>
                                                        Taxa estimada: <strong className="text-[#2c201b]">{formatCurrency(taxaCartaoCalculada)}</strong>
                                                    </span>
                                                    <span>
                                                        Liquido previsto:{" "}
                                                        <strong className="text-[#2c201b]">
                                                            {valorLiquidoCartao == null ? "Informe o valor" : formatCurrency(valorLiquidoCartao)}
                                                        </strong>
                                                    </span>
                                                </div>
                                                <p className="mt-1">Se preencher R$ e %, o valor fixo em R$ tem prioridade.</p>
                                                {taxaCartaoInvalida ? (
                                                    <p className="mt-1 font-medium text-[#B42318]">A taxa deve ser menor que o valor da receita.</p>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {!isTransferMode ? (
                                <div className="space-y-1.5">
                                    <Label className={labelClassName}>Centro de custo</Label>
                                    <SearchableSelect
                                        value={centroCustoId}
                                        onValueChange={setCentroCustoId}
                                        items={centroCustoItems}
                                        placeholder="Selecionar centro de custo"
                                        searchPlaceholder="Buscar centro de custo"
                                        className={fieldClassName}
                                        disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                    />
                                </div>
                            ) : null}

                            <div className="space-y-1.5 md:col-span-2">
                                <Label className={labelClassName}>Observações</Label>
                                <Textarea
                                    value={observacoes}
                                    onChange={(event) => setObservacoes(event.target.value)}
                                    rows={3}
                                    className={cn("bg-white", fieldClassName, "h-auto")}
                                    disabled={!(canCreate || canEditDirectly || canAdjust) || submitting}
                                />
                            </div>

                            {canAdjust ? (
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className={labelClassName}>Justificativa do ajuste</Label>
                                    <Textarea
                                        value={justificativa}
                                        onChange={(event) => setJustificativa(event.target.value)}
                                        rows={3}
                                        placeholder="Explique por que este lançamento precisa ser ajustado ou estornado."
                                        className={cn("bg-white", fieldClassName, "h-auto")}
                                        disabled={submitting}
                                    />
                                </div>
                            ) : null}

                            {!isCreateMode && item && isAdmin && originMeta ? (
                                <div className="space-y-1.5 md:col-span-2">
                                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                                        <div className="space-y-2 flex-1">
                                            <p className="font-semibold text-red-900">Atenção: Exclusão de lançamento vinculado</p>
                                            <p>A exclusão alterará a conta de origem para que seu valor retorne em aberto.</p>
                                            <div className="flex items-center space-x-2 mt-2">
                                                <Checkbox
                                                    id="confirmLinked"
                                                    checked={confirmLinkedDelete}
                                                    onCheckedChange={(checked) => setConfirmLinkedDelete(checked as boolean)}
                                                />
                                                <Label htmlFor="confirmLinked" className="text-sm font-medium text-red-900">
                                                    Estou ciente e assumo a responsabilidade pelo impacto desta exclusão.
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-[#e7e0d4] px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            className={operationalListGhostButtonClass}
                        >
                            {conferenceMode ? "Voltar para a conferência" : "Fechar"}
                        </Button>

                        {!isCreateMode && item && isAdmin && !sessionLocked ? (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={submitting || (originMeta !== null && !confirmLinkedDelete)}
                                className={cn("h-10 border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700")}
                            >
                                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                Excluir (Admin)
                            </Button>
                        ) : null}

                        {canAdjust ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReverse}
                                disabled={submitting}
                                className={operationalListMutedButtonClass}
                            >
                                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                Estornar
                            </Button>
                        ) : null}

                        {(canCreate || canEditDirectly || canAdjust) ? (
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={!canSubmit || submitting}
                                className={cn("h-10", operationalListPrimaryButtonClass)}
                            >
                                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                {isTransferMode ? "Criar transferência" : isCreateMode ? "Incluir transação" : canAdjust ? "Salvar ajuste" : "Salvar alteração"}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function SummaryStat({
    label,
    value,
    valueClassName,
}: {
    label: string
    value: string
    valueClassName?: string
}) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">{label}</p>
            <div className={cn("text-sm font-semibold text-[#2c201b]", valueClassName)}>{value}</div>
        </div>
    )
}
