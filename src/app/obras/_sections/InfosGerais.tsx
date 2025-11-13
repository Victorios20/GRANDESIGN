"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import {
  Copy,
  Hammer,
  User,
  MapPin,
  FileCheck,
  Wrench,
  ShoppingCart,
  PlayCircle,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"

import type { ObraInfosVM, ObraStatus } from "../lib/types"

// novo componente unificado de status
import { StatusSelect, type StatusOption } from "@/components/ui/StatusSelect"

type Option = { value: string; label: string }

type Props = {
  value: ObraInfosVM
  onChange: (patch: Partial<ObraInfosVM>) => void
  isEditing: boolean
  tiposObraOptions: Option[]
  telhaOptions: Option[]
}

// catálogo de status com cores e ícones
const STATUS_OPTIONS: StatusOption<ObraStatus>[] = [
  { label: "Assinatura de contrato",        value: "Assinatura de contrato",        color: "purple", icon: FileCheck },
  { label: "validação técnica",  value: "Aguardando validação técnica",  color: "amber",  icon: Wrench },
  { label: "Compras",                        value: "Compras",                        color: "blue",   icon: ShoppingCart },
  { label: "À iniciar",                      value: "À iniciar",                      color: "zinc",   icon: PlayCircle },
  { label: "Execução",                       value: "Execução",                       color: "emerald",icon: Hammer },
  { label: "Aguardando pagamento",           value: "Aguardando pagamento",           color: "yellow", icon: CreditCard },
  { label: "Pendência",                      value: "Pendência",                      color: "red",    icon: AlertTriangle },
  { label: "Finalizado",                     value: "Finalizado",                     color: "green",  icon: CheckCircle2 },
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
      <Card className="rounded-2xl shadow-md bg-white border-0" id="infos">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-green mb-4 flex items-center gap-2">
            <Hammer className="h-5 w-5 text-green" />
            Tipo de obra
          </h3>

          {/* Tipo de obra (OBRIGATÓRIO) */}
          <div className="flex flex-col gap-1 mb-4">
            <Label htmlFor="infos.tipoObra" className="text-black">Tipo de obra</Label>
            <input id="infos.tipoObra" className="sr-only" aria-hidden readOnly />
            {isEditing ? (
              <div className="rounded-xl">
                <ComboboxAdd
                  widthClass="w-full"
                  placeholder="Buscar tipo…"
                  buttonText={value.tipoObra || "Selecione"}
                  items={tiposObraOptions}
                  colorVariant="gray-green"
                  onSelect={(val) => onChange({ tipoObra: val })}
                  showEmptyOption={false}
                />
              </div>
            ) : (
              <div className="font-semibold text-black">{value.tipoObra || "-"}</div>
            )}
          </div>

          {/* Largura / Comprimento (OBRIGATÓRIOS) */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="infos.largura" className="text-black">Largura</Label>
              {isEditing ? (
                <Input
                  id="infos.largura"
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
              <Label htmlFor="infos.comprimento" className="text-black">Comprimento</Label>
              {isEditing ? (
                <Input
                  id="infos.comprimento"
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

          {/* Telha / Status (OBRIGATÓRIOS) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="infos.telhaEscolhida" className="text-black">Telha</Label>
              <input id="infos.telhaEscolhida" className="sr-only" aria-hidden readOnly />
              {isEditing ? (
                <div className="rounded-xl">
                  <ComboboxAdd
                    widthClass="w-full"
                    placeholder={telhaOptions.length ? "Selecionar telha…" : "Sem telhas no orçamento"}
                    buttonText={value.telhaEscolhida || telhaOptions[0]?.label || "Selecione"}
                    items={telhaOptions}
                    colorVariant="gray-green"
                    onSelect={(val) => onChange({ telhaEscolhida: val })}
                    showEmptyOption={false}
                  />
                </div>
              ) : (
                <div className="font-semibold text-black">{value.telhaEscolhida || "-"}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="infos.status" className="text-black">Status</Label>
              <input id="infos.status" className="sr-only" aria-hidden readOnly />
              {/* usando StatusSelect — dinâmico em edição; estático (pill) em view */}
              <StatusSelect<ObraStatus>
                options={STATUS_OPTIONS}
                value={value.status ?? null}
                onChange={(s) => onChange({ status: s })}
                mode={isEditing ? "dynamic" : "static"}
                staticVariant="pill"
                size="md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2 — Cliente */}
      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green flex items-center gap-2">
              <User className="h-5 w-5 text-green" />
              Cliente
            </h3>
            {!isEditing && value.cliente?.nome && (
              <Button variant="ghost" size="icon" onClick={() => copia(value.cliente!.nome!, "Cliente")}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Nome (sempre desabilitado) */}
          <div className="flex flex-col gap-1 mb-4">
            <Label className="text-black">Nome</Label>
            <Input disabled readOnly className={inputClass} value={value.cliente?.nome ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Telefone (sempre desabilitado) */}
            <div className="flex flex-col gap-1">
              <Label className="text-black">Telefone</Label>
              <Input disabled readOnly className={inputClass} value={value.cliente?.telefone ?? ""} />
            </div>

            {/* CPF (OBRIGATÓRIO e editável) */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="infos.cliente.cpf" className="text-black">CPF</Label>
              <Input
                id="infos.cliente.cpf"
                className={inputClass}
                value={value.cliente?.cpf ?? ""}
                onChange={(e) => onChange({ cliente: { ...(value.cliente ?? {}), cpf: e.target.value } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3 — Endereço */}
      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green" />
              Endereço
            </h3>
            {!isEditing && value.endereco?.logradouro && (
              <Button variant="ghost" size="icon" onClick={() => copia(value.endereco!.logradouro, "Endereço")}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Logradouro (AGORA OBRIGATÓRIO) */}
          <div className="flex flex-col gap-1 mb-4">
            <Label htmlFor="infos.logradouro" className="text-black">Logradouro</Label>
            {isEditing ? (
              <Input
                id="infos.logradouro"
                className={inputClass}
                value={value.endereco?.logradouro ?? ""}
                onChange={(e) => onChange({ endereco: { ...(value.endereco ?? {}), logradouro: e.target.value } })}
              />
            ) : (
              <Input disabled readOnly className={inputClass} value={value.endereco?.logradouro ?? ""} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Bairro (sempre desabilitado) */}
            <div className="flex flex-col gap-1">
              <Label className="text-black">Bairro</Label>
              <Input disabled readOnly className={inputClass} value={value.endereco?.bairro ?? ""} />
            </div>

            {/* Cidade (sempre desabilitado) */}
            <div className="flex flex-col gap-1">
              <Label className="text-black">Cidade</Label>
              <Input disabled readOnly className={inputClass} value={value.endereco?.cidade ?? ""} />
            </div>
          </div>

          {/* Maps (AGORA OBRIGATÓRIO) */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="infos.maps" className="text-black">Maps</Label>
            {isEditing ? (
              <Input
                id="infos.maps"
                className={inputClass}
                value={value.endereco?.mapsUrl ?? ""}
                onChange={(e) => onChange({ endereco: { ...(value.endereco ?? {}), mapsUrl: e.target.value } })}
              />
            ) : (
              <Input disabled readOnly className={inputClass} value={value.endereco?.mapsUrl ?? ""} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
