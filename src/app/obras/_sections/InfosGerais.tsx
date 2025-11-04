"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import { Copy } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"

import type { ObraInfosVM, ObraStatus } from "../lib/types"

type Option = { value: string; label: string }

type Props = {
  value: ObraInfosVM
  onChange: (patch: Partial<ObraInfosVM>) => void
  isEditing: boolean
  tiposObraOptions: Option[]
  telhaOptions: Option[]
}

const STATUS: ObraStatus[] = [
  "Assinatura de contrato",
  "Aguardando validação técnica",
  "Compras",
  "À iniciar",
  "Execução",
  "Aguardando pagamento",
  "Pendência",
  "Finalizado",
]

const inputClass =
  "h-9 border-0 bg-cinza rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"

export default function InfosGerais({
  value,
  onChange,
  isEditing,
  tiposObraOptions,
  telhaOptions,
}: Props) {
  const copia = (t: string, label: string) => {
    if (!t?.trim()) return
    navigator.clipboard.writeText(t).then(
      () => toast.success(`${label} copiado!`),
      () => toast.error(`Não foi possível copiar ${label}.`)
    )
  }

  const dims = useMemo(
    () => ({
      L: Number(value.largura || 0).toFixed(2),
      C: Number(value.comprimento || 0).toFixed(2),
    }),
    [value.largura, value.comprimento]
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* CARD 1 — Tipo de obra */}
      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-green mb-4">Tipo de obra</h3>

          <div className="flex flex-col gap-1 mb-4">
            <Label className="text-black">Tipo de obra</Label>
            {isEditing ? (
              <div className="rounded-xl">
                <ComboboxAdd
                  widthClass="w-full"
                  placeholder="Buscar tipo…"
                  buttonText={value.tipoObra || "Selecione"}
                  items={tiposObraOptions}
                  onSelect={(val) => onChange({ tipoObra: val })}
                  showEmptyOption={false}
                />
              </div>
            ) : (
              <div className="font-semibold text-black">{value.tipoObra || "—"}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <Label className="text-black">Largura</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className={`${inputClass} text-right`}
                  value={value.largura ?? 0}
                  onChange={(e) => onChange({ largura: Number(e.target.value || 0) })}
                />
              ) : (
                <div className="font-semibold text-black">{dims.L}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-black">Comprimento</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className={`${inputClass} text-right`}
                  value={value.comprimento ?? 0}
                  onChange={(e) => onChange({ comprimento: Number(e.target.value || 0) })}
                />
              ) : (
                <div className="font-semibold text-black">{dims.C}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-black">Telha</Label>
              {isEditing ? (
                <div className="rounded-xl">
                  <ComboboxAdd
                    widthClass="w-full"
                    placeholder={telhaOptions.length ? "Selecionar telha…" : "Sem telhas no orçamento"}
                    buttonText={value.telhaEscolhida || telhaOptions[0]?.label || "Selecione"}
                    items={telhaOptions}
                    onSelect={(val) => onChange({ telhaEscolhida: val })}
                    showEmptyOption={false}
                  />
                </div>
              ) : (
                <div className="font-semibold text-black">{value.telhaEscolhida || "—"}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-black">Status</Label>
              {isEditing ? (
                <div className="rounded-xl">
                  <ComboboxAdd
                    buttonText={value.status || "Selecione"}
                    placeholder="Buscar status..."
                    widthClass="w-full"
                    items={STATUS.map((s) => ({ value: s, label: s }))}
                    onSelect={(s) => onChange({ status: s as ObraStatus })}
                    showEmptyOption={false}
                  />
                </div>
              ) : (
                <div className="font-semibold text-black">{value.status || "—"}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2 — Cliente */}
      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green">Cliente</h3>
            {!isEditing && value.cliente?.nome && (
              <Button variant="ghost" size="icon" onClick={() => copia(value.cliente!.nome!, "Cliente")}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <Label className="text-black">Nome</Label>
            {isEditing ? (
              <Input
                className={inputClass}
                value={value.cliente?.nome ?? ""}
                onChange={(e) => onChange({ cliente: { ...(value.cliente ?? {}), nome: e.target.value } })}
              />
            ) : (
              <div className="font-semibold text-black">{value.cliente?.nome || "—"}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-black">Telefone</Label>
              {isEditing ? (
                <Input
                  className={inputClass}
                  value={value.cliente?.telefone ?? ""}
                  onChange={(e) => onChange({ cliente: { ...(value.cliente ?? {}), telefone: e.target.value } })}
                />
              ) : (
                <div className="font-semibold text-black">{value.cliente?.telefone || "—"}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-black">CPF</Label>
              {isEditing ? (
                <Input
                  className={inputClass}
                  value={value.cliente?.cpf ?? ""}
                  onChange={(e) => onChange({ cliente: { ...(value.cliente ?? {}), cpf: e.target.value } })}
                />
              ) : (
                <div className="font-semibold text-black">{value.cliente?.cpf || "—"}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3 — Endereço */}
      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green">Endereço</h3>
            {!isEditing && value.endereco?.logradouro && (
              <Button variant="ghost" size="icon" onClick={() => copia(value.endereco!.logradouro, "Endereço")}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <Label className="text-black">Logradouro</Label>
            {isEditing ? (
              <Input
                className={inputClass}
                value={value.endereco?.logradouro ?? ""}
                onChange={(e) => onChange({ endereco: { ...(value.endereco ?? {}), logradouro: e.target.value } })}
              />
            ) : (
              <div className="font-semibold text-black">{value.endereco?.logradouro || "—"}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <Label className="text-black">Bairro</Label>
              {isEditing ? (
                <Input
                  className={inputClass}
                  value={value.endereco?.bairro ?? ""}
                  onChange={(e) => onChange({ endereco: { ...(value.endereco ?? {}), bairro: e.target.value } })}
                />
              ) : (
                <div className="font-semibold text-black">{value.endereco?.bairro || "—"}</div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-black">Cidade</Label>
              {isEditing ? (
                <Input
                  className={inputClass}
                  value={value.endereco?.cidade ?? ""}
                  onChange={(e) => onChange({ endereco: { ...(value.endereco ?? {}), cidade: e.target.value } })}
                />
              ) : (
                <div className="font-semibold text-black">{value.endereco?.cidade || "—"}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-black">Maps</Label>
            {isEditing ? (
              <Input
                className={inputClass}
                value={value.endereco?.mapsUrl ?? ""}
                onChange={(e) => onChange({ endereco: { ...(value.endereco ?? {}), mapsUrl: e.target.value } })}
              />
            ) : (
              <div className="font-semibold text-black">{value.endereco?.mapsUrl || "—"}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
