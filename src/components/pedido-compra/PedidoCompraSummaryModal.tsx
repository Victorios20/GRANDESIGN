"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { getPedidoDetailsAction } from "@/actions/pedido_compra/get-pedido-details"
import { StatusBadge } from "@/components/pedido-compra/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { editableStatusList, statusConfig } from "@/lib/pedido-compra-theme"
import {
  integratePedidoCompraRequest,
  reversePedidoCompraIntegrationRequest,
  updatePedidoCompraStatusRequest,
} from "@/lib/pedido-compra-client"
import {
  canIntegratePedido,
  canReversePedidoIntegration,
  getPayableStatusLabel,
  getPedidoFinanceBadgeClass,
  getPedidoFinanceLabel,
  isPedidoIntegrated,
} from "@/lib/pedido-compra-finance"
import { formatDateLongBR, formatMoney, normalizeStatus, formatPedidoId } from "@/lib/pedido-compra-utils"
import type {
  PedidoCompraDetalhadoSnake,
  PedidoCompraSummaryInitialData,
  PedidoFinanceIntegrationStatus,
  PedidoStatus,
} from "@/types/pedido-compra"

type Props = {
  open: boolean
  pedidoId: number | null
  obraId?: number | null
  initialData?: PedidoCompraSummaryInitialData | null
  onOpenChange: (open: boolean) => void
  onEdit?: (pedidoId: number) => void
  onMutationComplete?: () => void | Promise<void>
}

function buildFallbackData(
  pedidoId: number | null,
  obraId?: number | null,
  initialData?: PedidoCompraSummaryInitialData | null
) {
  if (!pedidoId && !initialData) return null

  return {
    id: Number(initialData?.id ?? pedidoId ?? 0),
    obraId: initialData?.obraId ?? obraId ?? null,
    obraTitulo: initialData?.obraTitulo ?? null,
    descricao: initialData?.descricao ?? null,
    categoria: initialData?.categoria ?? null,
    status: initialData?.status ?? "RASCUNHO",
    fornecedorNome: initialData?.fornecedorNome ?? null,
    valorOrcado: initialData?.valorOrcado ?? null,
    valorPedido: initialData?.valorPedido ?? null,
    valorRealizado: initialData?.valorRealizado ?? null,
    dataEntrega: initialData?.dataEntrega ?? null,
    integracaoFinanceiraStatus: initialData?.integracaoFinanceiraStatus ?? (initialData?.integrado ? "INTEGRADO" : "NAO_INTEGRADO"),
    financeiroContaPagarId: initialData?.financeiroContaPagarId ?? null,
    financeiroContaPagarStatus: initialData?.financeiroContaPagarStatus ?? null,
  } satisfies PedidoCompraSummaryInitialData
}

function buildFallbackFromDetails(details: PedidoCompraDetalhadoSnake): PedidoCompraSummaryInitialData {
  return {
    id: details.id,
    obraId: details.obra_id,
    obraTitulo: details.obra?.titulo ?? null,
    descricao: details.descricao ?? null,
    categoria: details.categoria ?? null,
    status: details.status ?? null,
    fornecedorNome: details.fornecedor?.nome ?? null,
    valorOrcado: details.valor_orcado ?? null,
    valorPedido: details.valor_pedido ?? null,
    valorRealizado: details.valor_realizado ?? null,
    dataEntrega: details.data_entrega ?? null,
    integracaoFinanceiraStatus: details.financeiro_integracao_status,
    financeiroContaPagarId: details.financeiro_conta_pagar_id,
    financeiroContaPagarStatus: details.financeiro_conta_pagar_status,
  }
}

function calculateDisplayPedidoValue(
  details: PedidoCompraDetalhadoSnake | null,
  data: PedidoCompraSummaryInitialData | null
) {
  if (details?.valor_pedido != null) return details.valor_pedido
  if (data?.valorPedido != null) return data.valorPedido
  if (!details) return data?.valorOrcado ?? null

  const itensTotal = (details.itens ?? []).reduce((acc, item) => acc + Number(item.total ?? 0), 0)
  return itensTotal + Number(details.frete ?? 0)
}

function LoadingState() {
  return (
    <div className="space-y-6 py-2">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="h-5 w-full rounded bg-muted/80 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-6 w-full rounded bg-muted/80 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-10 w-full rounded bg-muted/70 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export function PedidoCompraSummaryModal({
  open,
  pedidoId,
  obraId,
  initialData,
  onOpenChange,
  onEdit,
  onMutationComplete,
}: Props) {
  const fallbackData = React.useMemo(
    () => buildFallbackData(pedidoId, obraId, initialData),
    [initialData, obraId, pedidoId]
  )

  const [data, setData] = React.useState<PedidoCompraSummaryInitialData | null>(fallbackData)
  const [details, setDetails] = React.useState<PedidoCompraDetalhadoSnake | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [statusEditorOpen, setStatusEditorOpen] = React.useState(false)
  const [statusDraft, setStatusDraft] = React.useState<PedidoStatus>("RASCUNHO")
  const [statusSaving, setStatusSaving] = React.useState(false)
  const [financeActionSaving, setFinanceActionSaving] = React.useState(false)
  type DisplayData = PedidoCompraSummaryInitialData & Partial<PedidoCompraDetalhadoSnake>

  React.useEffect(() => {
    if (!open) return
    setData(fallbackData)
    setDetails(null)
    setError(null)
  }, [fallbackData, open])

  const refreshDetails = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (!pedidoId || pedidoId <= 0) return

      setLoading(true)
      if (!options?.silent) {
        setError(null)
      }

      const response = await getPedidoDetailsAction(pedidoId)
      if (!response.success || !response.data) {
        const message = response.error || "Erro ao carregar detalhes do pedido"
        setError(message)
        setLoading(false)
        return
      }

      const nextDetails = response.data as PedidoCompraDetalhadoSnake
      setDetails(nextDetails)
      setData(buildFallbackFromDetails(nextDetails))
      setError(null)
      setLoading(false)
    },
    [pedidoId]
  )

  React.useEffect(() => {
    if (!open || !pedidoId || pedidoId <= 0) return
    void refreshDetails({ silent: Boolean(fallbackData) })
  }, [fallbackData, open, pedidoId, refreshDetails])

  const display = (details ?? data) as DisplayData | null
  const displayId = details?.id ?? data?.id ?? pedidoId ?? 0
  const displayObraId = details?.obra_id ?? data?.obraId ?? obraId ?? null
  const displayValorPedido = calculateDisplayPedidoValue(details, data)
  const currentStatus = normalizeStatus(String(details?.status ?? data?.status ?? "RASCUNHO"))
  const integrationStatus =
    (details?.financeiro_integracao_status ??
      data?.integracaoFinanceiraStatus ??
      (data?.integrado ? "INTEGRADO" : "NAO_INTEGRADO")) as PedidoFinanceIntegrationStatus
  const linkedPayableId = details?.financeiro_conta_pagar_id ?? data?.financeiroContaPagarId ?? null
  const linkedPayableStatus = details?.financeiro_conta_pagar_status ?? data?.financeiroContaPagarStatus ?? null
  const integrated = isPedidoIntegrated(integrationStatus)

  React.useEffect(() => {
    setStatusDraft(currentStatus)
  }, [currentStatus])

  const loadingInitial = open && loading && !display
  const loadingRefresh = open && loading && Boolean(display)
  const itens = Array.isArray(details?.itens) ? details.itens : []

  const handleStatusSubmit = async () => {
    if (!pedidoId || statusDraft === currentStatus) {
      setStatusEditorOpen(false)
      return
    }

    const previousDetails = details
    const previousData = data

    setStatusSaving(true)
    setError(null)
    setData((current) => (current ? { ...current, status: statusDraft } : current))
    setDetails((current) => (current ? { ...current, status: statusDraft } : current))

    try {
      await updatePedidoCompraStatusRequest(pedidoId, statusDraft)
      toast.success("Status atualizado")
      setStatusEditorOpen(false)
      await refreshDetails({ silent: true })
      await onMutationComplete?.()
    } catch (error: unknown) {
      setData(previousData)
      setDetails(previousDetails)
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar status")
    } finally {
      setStatusSaving(false)
    }
  }

  const handleFinanceAction = async (kind: "integrate" | "reverse") => {
    if (!pedidoId) return

    setFinanceActionSaving(true)
    setError(null)

    try {
      if (kind === "integrate") {
        await integratePedidoCompraRequest(pedidoId)
        toast.success("Pedido integrado ao financeiro")
      } else {
        await reversePedidoCompraIntegrationRequest(pedidoId)
        toast.success("Integração financeira estornada")
      }

      await refreshDetails({ silent: true })
      await onMutationComplete?.()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao executar ação financeira"
      setError(message)
      toast.error(message)
    } finally {
      setFinanceActionSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="flex items-center gap-3">
                <span className="font-mono text-xl">
                  {formatPedidoId(displayId || "TMP", displayObraId)}
                </span>

                <Popover open={statusEditorOpen} onOpenChange={setStatusEditorOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <StatusBadge status={currentStatus} className="cursor-pointer" />
                    </button>
                  </PopoverTrigger>

                  <PopoverContent align="start" className="w-72 space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Alterar status</p>
                      <p className="text-xs text-muted-foreground">Atualize o pedido sem sair do resumo.</p>
                    </div>

                    <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as PedidoStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        {editableStatusList.map((status) => (
                          <SelectItem key={status} value={normalizeStatus(status)}>
                            {statusConfig[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setStatusEditorOpen(false)} disabled={statusSaving}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleStatusSubmit} disabled={statusSaving || statusDraft === currentStatus}>
                        {statusSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Aplicar
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </DialogTitle>

              <DialogDescription>
                Consulte o pedido e atualize o status sem sair da tela.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              {loadingRefresh ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              {pedidoId ? (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`/pedido_compra/ver/${pedidoId}`} aria-label="Abrir página completa do pedido">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {loadingInitial ? <LoadingState /> : null}

        {!loadingInitial && error && !display ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Não foi possível carregar o pedido.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={() => void refreshDetails()}>Tentar novamente</Button>
            </div>
          </div>
        ) : null}

        {!loadingInitial && display ? (
          <div className="space-y-6">
            {error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</p>
                <p className="text-sm font-medium">{display.descricao || "—"}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Obra</p>
                <p className="text-sm font-medium">
                  #{display.obra_id ?? display.obraId ?? obraId ?? "—"}
                  {display.obra?.titulo || display.obraTitulo ? ` • ${display.obra?.titulo ?? display.obraTitulo}` : ""}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</p>
                <p className="text-sm">{String(display.categoria ?? "—")}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fornecedor</p>
                <p className="text-sm">{display.fornecedor?.nome ?? display.fornecedorNome ?? "—"}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Previsão de entrega</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{display.data_entrega ?? display.dataEntrega ? formatDateLongBR(display.data_entrega ?? display.dataEntrega) : "—"}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div>
                <span className="block text-xs text-muted-foreground">Valor do pedido</span>
                <span className="text-lg font-semibold">{formatMoney(displayValorPedido)}</span>
              </div>

              <div className="sm:border-l sm:pl-4">
                <span className="block text-xs text-muted-foreground">Conta a pagar</span>
                {linkedPayableId ? (
                  <Link
                    href={`/contas-pagar?highlight=${linkedPayableId}`}
                    className="text-sm font-semibold underline underline-offset-2"
                  >
                    CP #{linkedPayableId}
                    {linkedPayableStatus ? ` · ${linkedPayableStatus}` : ""}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Não integrado</span>
                )}
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-3">
              <div>
                <span className="block text-xs text-muted-foreground">Integração financeira</span>
                <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPedidoFinanceBadgeClass(integrationStatus)}`}>
                  {getPedidoFinanceLabel(integrationStatus)}
                </span>
              </div>

              <div>
                <span className="block text-xs text-muted-foreground">Conta a pagar vinculada</span>
                {linkedPayableId ? (
                  <a
                    href={`/contas-pagar?highlight=${linkedPayableId}`}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#393316] underline-offset-2 hover:underline"
                  >
                    #{linkedPayableId}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ) : (
                  <span className="text-sm font-medium">—</span>
                )}
              </div>

              <div>
                <span className="block text-xs text-muted-foreground">Status financeiro</span>
                <span className="text-sm font-medium">{getPayableStatusLabel(linkedPayableStatus)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Itens do pedido</h3>
                {loadingRefresh ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-16">Qtd</th>
                      <th className="px-3 py-2 text-left font-medium">Descrição</th>
                      <th className="px-3 py-2 text-right font-medium w-28">Unit.</th>
                      <th className="px-3 py-2 text-right font-medium w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itens.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-sm text-muted-foreground">
                          Nenhum item listado.
                        </td>
                      </tr>
                    ) : (
                      itens.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">{item.quantidade}</td>
                          <td className="px-3 py-2">
                            {item.descricao}
                            {item.tamanho ? (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({item.tamanho}m)
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{formatMoney(item.preco_unitario)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatMoney(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {pedidoId && canIntegratePedido(integrationStatus) ? (
            <Button variant="outline" onClick={() => void handleFinanceAction("integrate")} disabled={financeActionSaving}>
              {financeActionSaving ? "Integrando..." : "Integrar financeiro"}
            </Button>
          ) : null}
          {pedidoId && canReversePedidoIntegration(integrationStatus) ? (
            <Button variant="outline" onClick={() => void handleFinanceAction("reverse")} disabled={financeActionSaving}>
              {financeActionSaving ? "Estornando..." : "Estornar integração"}
            </Button>
          ) : null}
          {pedidoId && onEdit && !integrated ? <Button onClick={() => onEdit(pedidoId)}>Editar pedido</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
