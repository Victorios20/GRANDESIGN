"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"
import { cn } from "@/lib/utils"
import { Wallet, CreditCard } from "lucide-react"

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
  "h-9 border-0 bg-cinza rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"

const inputWhite =
  "h-9 border border-green/40 bg-white rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-green focus-visible:outline-none"

const FORMAS: Option[] = [
  { value: "Pix", label: "Pix" },
  { value: "6x", label: "6x" },
  { value: "10x", label: "10x" },
  { value: "12x", label: "12x" },
  { value: "16x", label: "16x" },
]

const STATUS: Option[] = [
  { value: "Efetuado", label: "Efetuado" },
  { value: "Pendente", label: "Pendente" },
]

function Money({ value }: { value?: number }) {
  if (typeof value !== "number" || Number.isNaN(value)) return <span>—</span>
  return <span>{value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
}

function StatusPill({ status }: { status?: StatusPagamento | null }) {
  if (!status)
    return <span className="inline-block rounded-full px-2.5 py-1 text-xs bg-neutral-300 text-black/80">—</span>
  if (status === "Efetuado")
    return <span className="inline-block rounded-full px-2.5 py-1 text-xs bg-blue-500 text-white">Efetuado</span>
  return <span className="inline-block rounded-full px-2.5 py-1 text-xs bg-neutral-800 text-white">Pendente</span>
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
          {/* Coluna esquerda: totais */}
          <div className="lg:col-span-1 flex flex-col justify-center">
            <div className="flex items-center gap-0.5 mb-3 sm:w-[520px]">
              <Label htmlFor="fin.valorObra" className="text-black shrink-0 w-32">Valor da obra</Label>
              {isEditing ? (
                <Input
                  id="fin.valorObra"
                  type="number"
                  className={cn(inputBase, "w-40")}
                  value={Number(value.valorObra ?? 0)}
                  onChange={(e) => patch({ valorObra: Number(e.target.value || 0) })}
                />
              ) : (
                <span className="font-bold inline-block w-40">
                  <Money value={value.valorObra} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 sm:w-[520px]">
              <Label htmlFor="fin.maoDeObra" className="text-black shrink-0 w-32">Mão de obra</Label>
              {isEditing ? (
                <Input
                  id="fin.maoDeObra"
                  type="number"
                  className={cn(inputBase, "w-40")}
                  value={Number(value.maoDeObra ?? 0)}
                  onChange={(e) => patch({ maoDeObra: Number(e.target.value || 0) })}
                />
              ) : (
                <span className="font-bold inline-block w-40">
                  <Money value={value.maoDeObra} />
                </span>
              )}
            </div>
          </div>

          {/* Card Pagamento */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-neutral-100 p-5 h-full">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-green" />
                <span className="text-2xl font-semibold text-green tracking-tight uppercase">Pagamento</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Entrada */}
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="fin.entrada.valor" className="text-black shrink-0 w-20">Entrada</Label>
                    {isEditing ? (
                      <Input
                        id="fin.entrada.valor"
                        type="number"
                        className={cn(inputWhite, "w-40")}
                        value={Number(entrada.valor ?? 0)}
                        onChange={(e) => patchEntrada({ valor: Number(e.target.value || 0) })}
                      />
                    ) : (
                      <span className="font-bold inline-block w-40">
                        <Money value={entrada.valor} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="fin.entrada.forma" className="text-black shrink-0 w-20">Forma</Label>
                    {/* Âncora invisível para foco/scroll */}
                    <input id="fin.entrada.forma" className="sr-only" aria-hidden readOnly />
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
                      <span className="font-semibold inline-block w-40">{entrada.forma || "—"}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="fin.entrada.status" className="text-black shrink-0 w-20">Status</Label>
                    {/* Âncora invisível para foco/scroll */}
                    <input id="fin.entrada.status" className="sr-only" aria-hidden readOnly />
                    {isEditing ? (
                      <div className="w-40">
                        <ComboboxAdd
                          widthClass="w-full"
                          placeholder="Selecionar…"
                          buttonText={entrada.status || "Selecione"}
                          items={STATUS}
                          onSelect={(v) => patchEntrada({ status: v as StatusPagamento })}
                          showEmptyOption={false}
                          colorVariant="white-green"
                        />
                      </div>
                    ) : (
                      <div className="w-40">
                        <StatusPill status={entrada.status || null} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Quitação */}
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="fin.quitacao.valor" className="text-black shrink-0 w-20">Quitação</Label>
                    {isEditing ? (
                      <Input
                        id="fin.quitacao.valor"
                        type="number"
                        className={cn(inputWhite, "w-40")}
                        value={Number(quitacao.valor ?? 0)}
                        onChange={(e) => patchQuitacao({ valor: Number(e.target.value || 0) })}
                      />
                    ) : (
                      <span className="font-bold inline-block w-40">
                        <Money value={quitacao.valor} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="fin.quitacao.forma" className="text-black shrink-0 w-20">Forma</Label>
                    {/* Âncora invisível para foco/scroll */}
                    <input id="fin.quitacao.forma" className="sr-only" aria-hidden readOnly />
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
                      <span className="font-semibold inline-block w-40">{quitacao.forma || "—"}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="fin.quitacao.status" className="text-black shrink-0 w-20">Status</Label>
                    {/* Âncora invisível para foco/scroll */}
                    <input id="fin.quitacao.status" className="sr-only" aria-hidden readOnly />
                    {isEditing ? (
                      <div className="w-40">
                        <ComboboxAdd
                          widthClass="w-full"
                          placeholder="Selecionar…"
                          buttonText={quitacao.status || "Selecione"}
                          items={STATUS}
                          onSelect={(v) => patchQuitacao({ status: v as StatusPagamento })}
                          showEmptyOption={false}
                          colorVariant="white-green"
                        />
                      </div>
                    ) : (
                      <div className="w-40">
                        <StatusPill status={quitacao.status || null} />
                      </div>
                    )}
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
