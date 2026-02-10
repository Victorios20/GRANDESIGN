"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"
import { cn } from "@/lib/utils"
import { Wallet, CreditCard, CheckCircle2, Clock } from "lucide-react"
import { StatusSelect, type StatusOption } from "@/components/ui/StatusSelect"

type FormaPagamento = "Pix" | "6x" | "10x" | "12x" | "16x"
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
  { value: "6x", label: "6x" },
  { value: "10x", label: "10x" },
  { value: "12x", label: "12x" },
  { value: "16x", label: "16x" },
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
    <Card className={cn("rounded-2xl shadow-md bg-white border-0", className)} id="financeiro">
      <CardContent className="p-6">
        <h3 className="text-2xl font-semibold text-green mb-4 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-green" />
          Financeiro
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Totais */}
          <div className="lg:col-span-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 mb-3">
              <Label className={cn("w-32 shrink-0", labelText)}>Valor da obra</Label>
              {isEditing ? (
                <Input
                  type="number"
                  className={cn(inputBase, "w-40")}
                  value={Number(value.valorObra ?? 0)}
                  onChange={(e) => patch({ valorObra: Number(e.target.value || 0) })}
                />
              ) : (
                <span className={cn(valueText, "inline-block w-40")}>
                  <Money value={value.valorObra} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Label className={cn("w-32 shrink-0", labelText)}>Mão de obra</Label>
              {isEditing ? (
                <Input
                  type="number"
                  className={cn(inputBase, "w-40")}
                  value={Number(value.maoDeObra ?? 0)}
                  onChange={(e) => patch({ maoDeObra: Number(e.target.value || 0) })}
                />
              ) : (
                <span className={cn(valueText, "inline-block w-40")}>
                  <Money value={value.maoDeObra} />
                </span>
              )}
            </div>
          </div>

          {/* Pagamento */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-neutral-100 p-5 h-full">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-green" />
                <span className="text-2xl font-semibold text-green tracking-tight uppercase">
                  Pagamento
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Entrada */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1">
                    <Label className={cn("w-20 shrink-0", labelText)}>Entrada</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        className={cn(inputWhite, "w-40")}
                        value={Number(entrada.valor ?? 0)}
                        onChange={(e) => patchEntrada({ valor: Number(e.target.value || 0) })}
                      />
                    ) : (
                      <span className={cn(valueText, "inline-block w-40")}>
                        <Money value={entrada.valor} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Label className={cn("w-20 shrink-0", labelText)}>Forma</Label>
                    {isEditing ? (
                      <div className="w-40">
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
                      <span className={cn(valueText, "inline-block w-40")}>
                        {entrada.forma || "-"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Label className={cn("w-20 shrink-0", labelText)}>Status</Label>
                    <div className="w-40">
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

                {/* Quitação */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1">
                    <Label className={cn("w-20 shrink-0", labelText)}>Quitação</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        className={cn(inputWhite, "w-40")}
                        value={Number(quitacao.valor ?? 0)}
                        onChange={(e) => patchQuitacao({ valor: Number(e.target.value || 0) })}
                      />
                    ) : (
                      <span className={cn(valueText, "inline-block w-40")}>
                        <Money value={quitacao.valor} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Label className={cn("w-20 shrink-0", labelText)}>Forma</Label>
                    {isEditing ? (
                      <div className="w-40">
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
                      <span className={cn(valueText, "inline-block w-40")}>
                        {quitacao.forma || "-"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Label className={cn("w-20 shrink-0", labelText)}>Status</Label>
                    <div className="w-40">
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
          {/* fim pagamento */}
        </div>
      </CardContent>
    </Card>
  )
}
