"use client"

import { useMemo } from "react"
import {
  Hammer,
  User,
  MapPin,
  Pencil,
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
import { StatusSelect, type StatusOption } from "@/components/ui/StatusSelect"

type Option = { value: string; label: string }

type Props = {
  value: ObraInfosVM
  onChange: (patch: Partial<ObraInfosVM>) => void
  isEditing: boolean
  tiposObraOptions: Option[]
  telhaOptions: Option[]
  onEditCliente: () => void
}

const STATUS_OPTIONS: StatusOption<ObraStatus>[] = [
  { label: "Assinatura de contrato", value: "Assinatura de contrato", color: "purple", icon: FileCheck },
  { label: "Aguardando validação técnica", value: "Aguardando validação técnica", color: "amber", icon: Wrench },
  { label: "Compras", value: "Compras", color: "blue", icon: ShoppingCart },
  { label: "À iniciar", value: "À iniciar", color: "zinc", icon: PlayCircle },
  { label: "Execução", value: "Execução", color: "emerald", icon: Hammer },
  { label: "Aguardando pagamento", value: "Aguardando pagamento", color: "yellow", icon: CreditCard },
  { label: "Pendência", value: "Pendência", color: "red", icon: AlertTriangle },
  { label: "Finalizado", value: "Finalizado", color: "green", icon: CheckCircle2 },
]

const inputClass =
  "h-9 border-0 bg-cinza rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"

const labelText = "text-neutral-700 text-sm font-medium"
const valueText = "text-neutral-800 text-sm font-normal tabular-nums tracking-tight"

export default function InfosGerais({
  value,
  onChange,
  isEditing,
  tiposObraOptions,
  telhaOptions,
  onEditCliente,
}: Props) {
  const dims = useMemo(
    () => ({
      L: Number(value.largura || 0).toFixed(2),
      C: Number(value.comprimento || 0).toFixed(2),
    }),
    [value.largura, value.comprimento]
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-green mb-4 flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Tipo de obra
          </h3>

          <div className="flex flex-col gap-1 mb-4">
            <Label className={labelText}>Tipo de obra</Label>
            {isEditing ? (
              <ComboboxAdd
                widthClass="w-full"
                placeholder="Buscar tipo…"
                buttonText={value.tipoObra || "Selecione"}
                items={tiposObraOptions}
                colorVariant="gray-green"
                onSelect={(val) => onChange({ tipoObra: val })}
                showEmptyOption={false}
              />
            ) : (
              <div className={valueText}>{value.tipoObra || "-"}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <Label className={labelText}>Largura</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step={0.01}
                  className={`${inputClass} text-right`}
                  value={value.largura ?? 0}
                  onChange={(e) => onChange({ largura: Number(e.target.value || 0) })}
                />
              ) : (
                <div className={valueText}>{dims.L}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label className={labelText}>Comprimento</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step={0.01}
                  className={`${inputClass} text-right`}
                  value={value.comprimento ?? 0}
                  onChange={(e) => onChange({ comprimento: Number(e.target.value || 0) })}
                />
              ) : (
                <div className={valueText}>{dims.C}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <Label className={labelText}>Telha</Label>
              {isEditing ? (
                <ComboboxAdd
                  widthClass="w-full"
                  placeholder="Selecionar telha…"
                  buttonText={value.telhaEscolhida || "Selecione"}
                  items={telhaOptions}
                  colorVariant="gray-green"
                  onSelect={(val) => onChange({ telhaEscolhida: val })}
                  showEmptyOption={false}
                />
              ) : (
                <div className={valueText}>{value.telhaEscolhida || "-"}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label className={labelText}>Status</Label>
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

          {/* Datas de prazo contratual */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label className={labelText}>Início da Obra</Label>
              {isEditing ? (
                <Input
                  type="date"
                  className={inputClass}
                  value={value.dataInicioObra ?? ""}
                  onChange={(e) => onChange({ dataInicioObra: e.target.value || null })}
                />
              ) : (
                <div className={valueText}>
                  {value.dataInicioObra
                    ? new Date(value.dataInicioObra + "T00:00:00").toLocaleDateString("pt-BR")
                    : "-"}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label className={labelText}>Término da Obra</Label>
              {isEditing ? (
                <Input
                  type="date"
                  className={inputClass}
                  value={value.dataFimObra ?? ""}
                  onChange={(e) => onChange({ dataFimObra: e.target.value || null })}
                />
              ) : (
                <div className={valueText}>
                  {value.dataFimObra
                    ? new Date(value.dataFimObra + "T00:00:00").toLocaleDateString("pt-BR")
                    : "-"}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </h3>

            <Button
              variant="ghost-green"
              size="icon"
              onClick={onEditCliente}
              disabled={!value.cliente?.nome}
              title={!value.cliente?.nome ? "Cliente não carregado" : "Editar cliente"}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <Label>Nome</Label>
            <Input disabled readOnly className={inputClass} value={value.cliente?.nome ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label>Telefone</Label>
              <Input disabled readOnly className={inputClass} value={value.cliente?.telefone ?? ""} />
            </div>

            <div className="flex flex-col gap-1">
              <Label>CPF</Label>
              <Input disabled readOnly className={inputClass} value={value.cliente?.cpf ?? ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md bg-white border-0">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-green mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </h3>

          <div className="flex flex-col gap-1 mb-4">
            <Label>Logradouro</Label>
            {isEditing ? (
              <Input
                className={inputClass}
                value={value.endereco?.logradouro ?? ""}
                onChange={(e) => onChange({ endereco: { ...value.endereco, logradouro: e.target.value } })}
              />
            ) : (
              <Input disabled readOnly className={inputClass} value={value.endereco?.logradouro ?? ""} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <Label>Bairro</Label>
              <Input disabled readOnly className={inputClass} value={value.endereco?.bairro ?? ""} />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Cidade</Label>
              <Input disabled readOnly className={inputClass} value={value.endereco?.cidade ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Maps</Label>
            {isEditing ? (
              <Input
                className={inputClass}
                value={value.endereco?.mapsUrl ?? ""}
                onChange={(e) => onChange({ endereco: { ...value.endereco, mapsUrl: e.target.value } })}
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
