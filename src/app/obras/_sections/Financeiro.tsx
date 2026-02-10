"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"
import { cn } from "@/lib/utils"
import { Wallet, CreditCard, CheckCircle2, Clock } from "lucide-react"
import { StatusSelect, type StatusOption } from "@/components/ui/StatusSelect"

type FormaPagamento = string
type StatusPagamento = "Efetuado" | "Pendente"

export type FinanceiroVM = {
  valorObra?: number
  maoDeObra?: number
  pagamento?: {
    entrada?: { valor?: number; forma?: FormaPagamento | null; status?: StatusPagamento | null }
    quitacao?: { valor?: number; forma?: FormaPagamento | null; status?: StatusPagamento | null }
  }
}

type Option = { value: string; label: string }

type Props = {
  value: FinanceiroVM
  onChange: (patch: Partial<FinanceiroVM>) => void
  isEditing: boolean
  className?: string
}

const inputBase =
  "h-9 rounded-xl px-3 text-sm font-medium text-neutral-900 tabular-nums tracking-tight bg-neutral-100 border border-neutral-300 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"

const inputWhite =
  "h-9 rounded-xl px-3 text-sm font-medium text-neutral-900 tabular-nums tracking-tight bg-white border border-green/40 focus-visible:ring-2 focus-visible:ring-green focus-visible:outline-none"

const labelText = "text-neutral-700 text-sm font-medium"
const valueText = "text-neutral-800 text-sm font-normal tabular-nums tracking-tight"

const FORMAS: Option[] = [
  { value: "Pix", label: "Pix" },
  ...Array.from({ length: 21 }, (_, i) => ({ value: `${i + 1}x`, label: `${i + 1}x` })),
]

const STATUS_OPTIONS: StatusOption<StatusPagamento>[] = [
  { label: "Efetuado", value: "Efetuado", color: "blue", icon: CheckCircle2 },
  { label: "Pendente", value: "Pendente", color: "yellow", icon: Clock },
]

function Money({ value }: { value?: number }) {
  if (typeof value !== "number" || Number.isNaN(value)) return <span>—</span>
  return <span>{value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
}

export default function Financeiro({ value, onChange, isEditing, className }: Props) {
  const entrada = value.pagamento?.entrada ?? {}
  const quitacao = value.pagamento?.quitacao ?? {}

  const patch = (p: Partial<FinanceiroVM>) => onChange({ ...value, ...p })
  const patchEntrada = (p: Partial<typeof entrada>) =>
    patch({ pagamento: { ...value.pagamento, entrada: { ...entrada, ...p } } })
  const patchQuitacao = (p: Partial<typeof quitacao>) =>
    patch({ pagamento: { ...value.pagamento, quitacao: { ...quitacao, ...p } } })

  return (
    <Card className={cn("rounded-2xl shadow-sm bg-white border-0", className)} id="financeiro">
      <CardContent className="p-6 space-y-8">
        <h3 className="text-xl font-semibold text-green mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-green" />
          Financeiro
        </h3>

        {/* 1. Totais (Topo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-green/5 rounded-xl border border-green/10">
          <div className="flex flex-col gap-1">
            <Label className={cn("text-green font-semibold mb-1")}>Valor da Obra</Label>
            {isEditing ? (
              <Input
                type="number"
                className={cn(inputWhite, "w-full text-lg h-11")}
                value={Number(value.valorObra ?? 0)}
                onChange={(e) => patch({ valorObra: Number(e.target.value || 0) })}
              />
            ) : (
              <span className="text-2xl font-semibold text-green tracking-tight">
                <Money value={value.valorObra} />
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className={cn("text-green font-semibold mb-1")}>Mão de Obra</Label>
            {isEditing ? (
              <Input
                type="number"
                className={cn(inputWhite, "w-full text-lg h-11")}
                value={Number(value.maoDeObra ?? 0)}
                onChange={(e) => patch({ maoDeObra: Number(e.target.value || 0) })}
              />
            ) : (
              <span className="text-2xl font-semibold text-green tracking-tight">
                <Money value={value.maoDeObra} />
              </span>
            )}
          </div>
        </div>

        {/* 2. Pagamentos (Abaixo) */}
        <div>
          <div className="mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
            <CreditCard className="h-5 w-5 text-green" />
            <span className="text-lg font-semibold text-green">
              Pagamento
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna Entrada */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-l-4 border-green pl-3">Entrada</h4>

              <div className="space-y-3">
                <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
                  <Label className={labelText}>Valor</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      className={cn(inputBase, "w-full bg-white")}
                      value={Number(entrada.valor ?? 0)}
                      onChange={(e) => patchEntrada({ valor: Number(e.target.value || 0) })}
                    />
                  ) : (
                    <span className={valueText}>
                      <Money value={entrada.valor} />
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
                  <Label className={labelText}>Forma</Label>
                  {isEditing ? (
                    <div className="w-full">
                      <ComboboxAdd
                        widthClass="w-full"
                        placeholder="Selecionar…"
                        buttonText={entrada.forma || "Selecione"}
                        items={FORMAS}
                        onSelect={(v) => patchEntrada({ forma: v as FormaPagamento })}
                        showEmptyOption={false}
                        colorVariant="white-green"
                      />
                    </div>
                  ) : (
                    <span className={valueText}>
                      {entrada.forma || "-"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
                  <Label className={labelText}>Status</Label>
                  <div className="w-full">
                    <StatusSelect
                      options={STATUS_OPTIONS}
                      value={entrada.status ?? null}
                      onChange={(v) => patchEntrada({ status: v })}
                      mode={isEditing ? "dynamic" : "static"}
                      staticVariant="pill"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Quitação */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-l-4 border-green pl-3">Quitação</h4>

              <div className="space-y-3">
                <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
                  <Label className={labelText}>Valor</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      className={cn(inputBase, "w-full bg-white")}
                      value={Number(quitacao.valor ?? 0)}
                      onChange={(e) => patchQuitacao({ valor: Number(e.target.value || 0) })}
                    />
                  ) : (
                    <span className={valueText}>
                      <Money value={quitacao.valor} />
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
                  <Label className={labelText}>Forma</Label>
                  {isEditing ? (
                    <div className="w-full">
                      <ComboboxAdd
                        widthClass="w-full"
                        placeholder="Selecionar…"
                        buttonText={quitacao.forma || "Selecione"}
                        items={FORMAS}
                        onSelect={(v) => patchQuitacao({ forma: v as FormaPagamento })}
                        showEmptyOption={false}
                        colorVariant="white-green"
                      />
                    </div>
                  ) : (
                    <span className={valueText}>
                      {quitacao.forma || "-"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
                  <Label className={labelText}>Status</Label>
                  <div className="w-full">
                    <StatusSelect
                      options={STATUS_OPTIONS}
                      value={quitacao.status ?? null}
                      onChange={(v) => patchQuitacao({ status: v })}
                      mode={isEditing ? "dynamic" : "static"}
                      staticVariant="pill"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
