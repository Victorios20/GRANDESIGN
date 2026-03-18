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
  Copy,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"
import { calculateLShapeArea } from "@/lib/l-shape-area"

import type { ObraInfosVM, ObraStatus } from "../lib/types"
import { StatusSelect, type StatusOption } from "@/components/ui/StatusSelect"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useState } from "react"

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

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null

  const normalized = String(value).trim()
  const dateLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
  if (dateLike) {
    const [, year, month, day] = dateLike
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const direct = new Date(normalized)
  if (!Number.isNaN(direct.getTime())) return direct

  return null
}

function formatDateInputValue(value: string | null | undefined): string {
  const parsed = parseDateValue(value)
  return parsed ? format(parsed, "yyyy-MM-dd") : ""
}

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

  const isL = useMemo(() => {
    return [value.larguraMaior, value.larguraMenor, value.comprimentoMaior, value.comprimentoMenor].some(
      (dimension) => dimension !== null && dimension !== undefined
    )
  }, [value.larguraMaior, value.larguraMenor, value.comprimentoMaior, value.comprimentoMenor])

  const lAreaTotal = useMemo(
    () =>
      calculateLShapeArea({
        larguraMaior: value.larguraMaior,
        larguraMenor: value.larguraMenor,
        comprimentoMaior: value.comprimentoMaior,
        comprimentoMenor: value.comprimentoMenor,
      }),
    [value.larguraMaior, value.larguraMenor, value.comprimentoMaior, value.comprimentoMenor]
  )

  const [isConclusionModalOpen, setIsConclusionModalOpen] = useState(false)
  const [conclusionDate, setConclusionDate] = useState<Date | undefined>(new Date())

  const handleStatusChange = (newStatus: ObraStatus) => {
    if (newStatus === "Finalizado" && value.status !== "Finalizado") {
      setConclusionDate(new Date())
      setIsConclusionModalOpen(true)
    } else {
      onChange({ status: newStatus })
    }
  }

  const confirmConclusion = () => {
    onChange({
      status: "Finalizado",
      dataConclusao: conclusionDate ? format(conclusionDate, "yyyy-MM-dd") : null,
    })
    setIsConclusionModalOpen(false)
  }

  const handleCopyClientInfo = async () => {
    const text = [
      value.cliente?.nome,
      value.cliente?.telefone,
      value.endereco?.logradouro,
      value.endereco?.mapsUrl
    ].filter(Boolean).join("\n")

    if (!text.trim()) {
      toast.error("Sem dados para copiar")
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      toast.success("Dados copiados!")
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* SECTION 1: IDENTITY (Header) */}
      <Card className="rounded-2xl shadow-sm bg-white border-0 overflow-hidden">
        {/* Removed top green line as requested */}
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 w-full">
              <Label className="text-xs font-semibold text-green uppercase tracking-wider mb-1 block">
                Obra
              </Label>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Input
                    className="text-2xl font-bold h-auto py-2 px-0 border-0 border-b border-marromClaro/50 rounded-none focus-visible:ring-0 focus-visible:border-marromEscuro bg-transparent placeholder:text-muted-foreground/50"
                    value={value.titulo ?? ""}
                    placeholder="Nome do Cliente [Bairro - Cidade]"
                    onChange={(e) => onChange({ titulo: e.target.value ?? "" })}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <ComboboxAdd
                      widthClass="w-[200px]"
                      placeholder="Tipo de obra..."
                      buttonText={value.tipoObra || "Selecione"}
                      items={tiposObraOptions}
                      colorVariant="gray-green"
                      onSelect={(val) => onChange({ tipoObra: val })}
                      showEmptyOption={false}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-marromEscuro leading-tight">
                    {value.titulo || "Sem título definido"}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                    <Hammer className="w-3 h-3" />
                    {value.tipoObra || "Tipo não informado"}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 min-w-[200px]">
              <Label className="text-xs font-medium text-muted-foreground">Status Atual</Label>
              <StatusSelect<ObraStatus>
                options={STATUS_OPTIONS}
                value={value.status ?? null}
                onChange={handleStatusChange}
                mode={isEditing ? "dynamic" : "static"}
                staticVariant="badge"
                size="lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: THE GRID (Asymmetric) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: TECHNICAL SPECS (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="rounded-2xl shadow-sm bg-white border-0 h-full">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-marromEscuro mb-6 flex items-center gap-2 pb-2 border-b border-marromClaro/20">
                <Wrench className="w-4 h-4 text-green" />
                Especificações Técnicas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {/* Dimensions Group */}
                <div className="col-span-full bg-cinza/50 rounded-xl p-4 border border-marromClaro/10">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-medium text-muted-foreground block">Dimensões (m)</Label>
                    
                    {isEditing && (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="is-l-shape" 
                          checked={isL} 
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              onChange({ larguraMaior: null, larguraMenor: null, comprimentoMaior: null, comprimentoMenor: null })
                            } else {
                              // Initialize with some values or zeroes to trigger the UI
                              onChange({ larguraMaior: 0, larguraMenor: 0, comprimentoMaior: 0, comprimentoMenor: 0 })
                            }
                          }}
                        />
                        <Label htmlFor="is-l-shape" className="text-xs font-medium text-marromEscuro cursor-pointer">
                          Coberta em L
                        </Label>
                      </div>
                    )}
                    {!isEditing && isL && (
                      <span className="text-[10px] bg-green/10 text-green px-2 py-0.5 rounded-full font-medium">
                        Formato L
                      </span>
                    )}
                  </div>

                  {!isL ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-marromEscuro mb-1 block">Largura</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step={0.01}
                            className="bg-white border-marromClaro/30"
                            value={value.largura ?? 0}
                            onChange={(e) => onChange({ largura: Number(e.target.value || 0) })}
                          />
                        ) : (
                          <div className="text-xl font-medium text-marromEscuro">{dims.L}</div>
                        )}
                      </div>
                      <span className="text-muted-foreground pt-4">x</span>
                      <div className="flex-1">
                        <Label className="text-xs text-marromEscuro mb-1 block">Comprimento</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step={0.01}
                            className="bg-white border-marromClaro/30"
                            value={value.comprimento ?? 0}
                            onChange={(e) => onChange({ comprimento: Number(e.target.value || 0) })}
                          />
                        ) : (
                          <div className="text-xl font-medium text-marromEscuro">{dims.C}</div>
                        )}
                      </div>
                      <div className="flex-1 pl-4 border-l border-marromClaro/20">
                        <Label className="text-xs text-muted-foreground mb-1 block">Área Total</Label>
                        <div className="text-xl font-bold text-green">
                          {(Number(value.largura || 0) * Number(value.comprimento || 0)).toFixed(2)} m²
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-marromEscuro mb-1 block">Largura Maior</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step={0.01}
                            className="bg-white border-marromClaro/30"
                            value={value.larguraMaior ?? 0}
                            onChange={(e) => onChange({ larguraMaior: Number(e.target.value || 0) })}
                          />
                        ) : (
                          <div className="text-lg font-medium text-marromEscuro">{Number(value.larguraMaior || 0).toFixed(2)}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-marromEscuro mb-1 block">Largura Menor</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step={0.01}
                            className="bg-white border-marromClaro/30"
                            value={value.larguraMenor ?? 0}
                            onChange={(e) => onChange({ larguraMenor: Number(e.target.value || 0) })}
                          />
                        ) : (
                          <div className="text-lg font-medium text-marromEscuro">{Number(value.larguraMenor || 0).toFixed(2)}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-marromEscuro mb-1 block">Compr. Maior</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step={0.01}
                            className="bg-white border-marromClaro/30"
                            value={value.comprimentoMaior ?? 0}
                            onChange={(e) => onChange({ comprimentoMaior: Number(e.target.value || 0) })}
                          />
                        ) : (
                          <div className="text-lg font-medium text-marromEscuro">{Number(value.comprimentoMaior || 0).toFixed(2)}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-marromEscuro mb-1 block">Compr. Menor</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step={0.01}
                            className="bg-white border-marromClaro/30"
                            value={value.comprimentoMenor ?? 0}
                            onChange={(e) => onChange({ comprimentoMenor: Number(e.target.value || 0) })}
                          />
                        ) : (
                          <div className="text-lg font-medium text-marromEscuro">{Number(value.comprimentoMenor || 0).toFixed(2)}</div>
                        )}
                      </div>
                      <div className="col-span-2 lg:col-span-1 flex-1 lg:pl-4 lg:border-l border-marromClaro/20">
                        <Label className="text-xs text-muted-foreground mb-1 block">Área Total</Label>
                        <div className="text-xl font-bold text-green">
                          {lAreaTotal.toFixed(2)} m²
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className={labelText}>Telha Escolhida</Label>
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
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green/5 text-green text-sm font-medium border border-green/10">
                      <Hammer className="w-4 h-4" />
                      {value.telhaEscolhida || "Não definida"}
                    </div>
                  )}
                </div>

                <div className="col-span-full mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <FileCheck className="w-4 h-4 text-marromEscuro" />
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auditoria de Datas</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Dates */}
                    {[
                      { label: "Criação da Obra", val: value.dataCriacao, key: "dataCriacao" },
                      { label: "Contrato", val: value.dataContrato, key: "dataContrato" },
                      { label: "Data de Conclusão", val: value.dataConclusao, key: "dataConclusao" }
                    ].map((item: any) => (
                      <div key={item.label} className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground">{item.label}</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            className="h-8 text-xs bg-cinza border-0"
                            value={formatDateInputValue(item.val)}
                            onChange={(e: any) => onChange({ [item.key]: e.target.value || null })}
                          />
                        ) : (
                          <div className="text-sm font-medium text-marromEscuro">
                            {(() => {
                              const parsed = parseDateValue(item.val)
                              return parsed ? format(parsed, "dd/MM/yyyy") : "-"
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: CONTEXT (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Client Card */}
          <Card className="rounded-2xl shadow-sm bg-white border-0">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-marromEscuro flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-marromEscuro hover:bg-marromClaro/20"
                    onClick={handleCopyClientInfo}
                    title="Copiar dados do cliente"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-marromEscuro hover:bg-marromClaro/20"
                    onClick={onEditCliente}
                    disabled={!value.cliente?.nome}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-base font-bold text-marromEscuro">
                    {value.cliente?.nome || "Cliente não vinculado"}
                  </div>
                  {value.cliente?.cpf && (
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      CPF: {value.cliente.cpf}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-marromEscuro/10">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Telefone</Label>
                    <div className="text-sm">{value.cliente?.telefone || "-"}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card className="rounded-2xl shadow-sm bg-white border-0 flex-1">
            <CardContent className="p-5 h-full flex flex-col">
              <h3 className="text-sm font-semibold text-marromEscuro mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </h3>

              <div className="space-y-4 flex-1">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Logradouro</Label>
                  {isEditing ? (
                    <Input
                      className={inputClass}
                      value={value.endereco?.logradouro ?? ""}
                      onChange={(e) => onChange({ endereco: { ...value.endereco, logradouro: e.target.value } })}
                    />
                  ) : (
                    <div className="text-sm font-medium">{value.endereco?.logradouro || "-"}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Bairro</Label>
                    <div className="text-sm text-marromEscuro">{value.endereco?.bairro || "-"}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <div className="text-sm text-marromEscuro">{value.endereco?.cidade || "-"}</div>
                  </div>
                </div>

                {/* Google Maps Link */}
                <div className="pt-2">
                  {isEditing ? (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Link do Maps</Label>
                      <Input
                        className={inputClass}
                        value={value.endereco?.mapsUrl ?? ""}
                        onChange={(e) => onChange({ endereco: { ...value.endereco, mapsUrl: e.target.value } })}
                        placeholder="https://maps.google.com..."
                      />
                    </div>
                  ) : value.endereco?.mapsUrl ? (
                    <a
                      href={value.endereco.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-green hover:underline bg-green/5 p-2 rounded-lg border border-green/10 transition-colors hover:bg-green/10"
                    >
                      <MapPin className="w-3 h-3" />
                      Abrir no Google Maps
                    </a>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Conclusão de Obra */}
      <Dialog open={isConclusionModalOpen} onOpenChange={setIsConclusionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green">
              <CheckCircle2 className="w-5 h-5" />
              Finalizar Obra
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Ao marcar como finalizada, os pagamentos pendentes serão marcados como efetuados e os pedidos de compra em aberto serão marcados como entregues.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-conclusao">Data de Conclusão</Label>
              <Input
                id="data-conclusao"
                type="date"
                className={inputClass}
                value={conclusionDate ? format(conclusionDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    // Cuidado com fuso horário, usando as construtor para evitar bug de dia anterior
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setConclusionDate(new Date(year, month - 1, day));
                  } else {
                    setConclusionDate(undefined);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConclusionModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-green hover:bg-green/90 text-white"
              onClick={confirmConclusion}
            >
              Confirmar Finalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
