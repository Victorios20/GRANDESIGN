"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarDays, Plus, Trash2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

import type {
  PedidoCompraVM,
  PedidoStatusPadrao,
  PedidoStatusMateriais,
  PedidoStatusAndaimes,
} from "../lib/types"

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

type CatalogoItem = { nome: string; preco?: number }
type Catalogo = {
  madeiras: CatalogoItem[]
  materiaisGerais: CatalogoItem[]
  telhas: CatalogoItem[]
}

type Componente = { id?: number; nome?: string; descricao?: string; categoria?: string } | any

type Props = {
  value: PedidoCompraVM
  onChange: (patch: Partial<PedidoCompraVM>) => void
  isEditing: boolean
  telhaSelecionada?: string | null
  telhaUnidades?: number | null
  catalogo?: Catalogo
  componentes?: Componente[]
}

const PADRAO: PedidoStatusPadrao[] = ["Pendente", "Aguardando pagamento", "Pedido feito", "Entregue"]
const MATERIAIS: PedidoStatusMateriais[] = ["Pendente", "Em estoque", "Entregue"]
const ANDAIMES: PedidoStatusAndaimes[] = ["Pendente", "Pedido feito", "Entregue", "À coletar", "Coletado"]

const input =
  "h-9 border-0 bg-cinza rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"

function Money({ value }: { value?: number }) {
  if (typeof value !== "number" || Number.isNaN(value)) return <span>—</span>
  return <span>{value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
}

// aceita className para manter mesma largura dos inputs
function DateField({
  iso,
  onChange,
  disabled,
  className,
}: {
  iso: string | null | undefined
  onChange: (iso: string | null) => void
  disabled?: boolean
  className?: string
}) {
  const date = iso ? new Date(iso) : undefined
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 rounded-xl bg-cinza border-0 pr-3 pl-2 text-left font-normal",
            className
          )}
          disabled={disabled}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data…</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? d.toISOString() : null)}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}

function nomeDoItemTelha(it: any): string {
  const n = (it?.descricao ?? it?.nome ?? "").toString().trim()
  return n
}
function totalItemTelha(it: any): number {
  const qtd = Number(it?.quantidade ?? 0)
  const preco = Number(it?.preco ?? it?.precoUnitario ?? 0)
  const frete = Number(it?.frete ?? 0)
  const totalCalc = preco * qtd + (Number.isFinite(frete) ? frete : 0)
  const total = Number(it?.total ?? totalCalc)
  return Number.isFinite(total) ? total : 0
}

const newId = () => Date.now() + Math.floor(Math.random() * 1000)

export default function PedidoCompra({
  value,
  onChange,
  isEditing,
  telhaSelecionada,
  telhaUnidades,
  catalogo,
  componentes,
}: Props) {
  const materiaisOptions = useMemo(
    () => (catalogo?.materiaisGerais ?? []).map((m) => ({ value: m.nome, label: m.nome })),
    [catalogo?.materiaisGerais]
  )
  const madeirasOptions = useMemo(
    () => (catalogo?.madeiras ?? []).map((m) => ({ value: m.nome, label: m.nome })),
    [catalogo?.madeiras]
  )
  const componentesOptions = useMemo(
    () =>
      (componentes ?? []).map((c: any) => {
        const nome = (c?.nome ?? c?.descricao ?? "").toString()
        return { value: nome, label: nome }
      }),
    [componentes]
  )

  // preço por material (nome -> preço)
  const precoMateriaisMap = useMemo(() => {
    const entries: Array<[string, number]> = (catalogo?.materiaisGerais ?? [])
      .map((m) => [String(m?.nome ?? ""), toNum(m?.preco)] as [string, number])
      .filter(([k]) => k.length > 0)
    return new Map<string, number>(entries)
  }, [catalogo?.materiaisGerais])

  // preço por madeira (nome -> preço)
  const precoMadeirasMap = useMemo(() => {
    const entries: Array<[string, number]> = (catalogo?.madeiras ?? [])
      .map((m) => [String(m?.nome ?? ""), toNum(m?.preco)] as [string, number])
      .filter(([k]) => k.length > 0)
    return new Map<string, number>(entries)
  }, [catalogo?.madeiras])

  const telhaItensSelecionados = useMemo(() => {
    const alvo = (telhaSelecionada ?? "").toString().trim()
    if (!alvo) return []
    return (value.telha?.itens ?? []).filter((it: any) => nomeDoItemTelha(it) === alvo)
  }, [value.telha?.itens, telhaSelecionada])

  const totalTelhaUn = useMemo(() => {
    if (typeof telhaUnidades === "number") return telhaUnidades
    const somaSelecionada = telhaItensSelecionados.reduce((s, it: any) => s + Number(it?.quantidade ?? 0), 0)
    if (somaSelecionada > 0) return somaSelecionada
    return (value.telha?.itens || []).reduce((s, it: any) => s + Number(it?.quantidade ?? 0), 0)
  }, [value.telha?.itens, telhaUnidades, telhaItensSelecionados])

  const orcamentoTelhaDerivado = useMemo(() => {
    if (!telhaSelecionada) return 0
    const itens = telhaItensSelecionados
    if (!itens.length) return 0
    return itens.reduce((s, it: any) => s + totalItemTelha(it), 0)
  }, [telhaItensSelecionados, telhaSelecionada])

  const patchTelha = (p: any) => onChange({ telha: { ...value.telha, ...p } })
  const patchMadeira = (p: any) => onChange({ madeira: { ...value.madeira, ...p } })
  const patchMateriais = (p: any) => onChange({ materiais: { ...value.materiais, ...p } })
  const patchAndaimes = (p: any) => onChange({ andaimes: { ...value.andaimes, ...p } })

  const orcamentoTelhaExibido = useMemo(() => {
    const v = value.telha?.orcamento
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v
    return orcamentoTelhaDerivado
  }, [value.telha?.orcamento, orcamentoTelhaDerivado])

  const addLinhaMadeira = () => {
    if (!isEditing) return
    const itens = [...(value.madeira?.itens ?? [])]
    itens.push({
      id: newId(),
      componente: "",
      madeiraNome: "",
      descricao: "",
      quantidade: 0,
      tamanho: 0,
      precoUnitario: 0,
      total: 0,
    })
    patchMadeira({ itens })
  }

  const addLinhaMateriais = () => {
    if (!isEditing) return
    const itens = [...(value.materiais?.itens ?? [])]
    itens.push({
      id: newId(),
      descricao: "",
      quantidade: 0,
      precoUnitario: 0,
      total: 0,
    })
    patchMateriais({ itens })
  }

  const addLinhaAndaimes = () => {
    if (!isEditing) return
    const itens = [...(value.andaimes?.itens ?? [])]
    itens.push({
      id: newId(),
      descricao: "",
      quantidade: 0,
      precoUnitario: 0,
      total: 0,
    })
    patchAndaimes({ itens })
  }

  const removeLinhaMadeira = (idx: number) => {
    if (!isEditing) return
    const itens = [...(value.madeira?.itens ?? [])]
    itens.splice(idx, 1)
    patchMadeira({ itens })
  }

  const removeLinhaMateriais = (idx: number) => {
    if (!isEditing) return
    const itens = [...(value.materiais?.itens ?? [])]
    itens.splice(idx, 1)
    patchMateriais({ itens })
  }

  const removeLinhaAndaimes = (idx: number) => {
    if (!isEditing) return
    const itens = [...(value.andaimes?.itens ?? [])]
    itens.splice(idx, 1)
    patchAndaimes({ itens })
  }

  const recalcTotal = (precoUnitario?: number, quantidade?: number, total?: number) => {
    const hasPU = typeof precoUnitario === "number" && Number.isFinite(precoUnitario)
    const hasQ = typeof quantidade === "number" && Number.isFinite(quantidade)
    if (hasPU && hasQ) return toNum(precoUnitario) * toNum(quantidade)
    return typeof total === "number" ? total : 0
  }

  return (
    <Card className="rounded-2xl shadow-md bg-white border-0 mt-6">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="flex flex-col gap-10">
            {/* TELHAS — colunas com label+valor lado a lado, inputs pequenos */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-semibold text-green m-0">Telhas</h3>
                {isEditing ? (
                  <div className="rounded-xl w-[200px]">
                    <ComboboxAdd
                      widthClass="w-full"
                      placeholder="Selecionar status…"
                      buttonText={value.telha?.status || "Selecione"}
                      items={PADRAO.map((s) => ({ value: s, label: s }))}
                      onSelect={(s) => patchTelha({ status: s as PedidoStatusPadrao })}
                      showEmptyOption={false}
                      colorVariant="gray-brown"
                    />
                  </div>
                ) : (
                  <span className="text-black/70">• {value.telha?.status || "—"}</span>
                )}
              </div>

              {/* 2 colunas; cada coluna contém: Label + Campo coladinhos */}
              <div
                className="
      grid grid-cols-1 sm:grid-cols-2
      gap-x-1 sm:gap-x-0  /* ↓ distância ENTRE COLUNAS reduzida ao mínimo */
      gap-y-2
      sm:w-[520px]
    "
              >
                {/* Linha 1 — Orçamento | Previsão */}
                <div className="flex items-center gap-0.5"> {/* ↓ label x input mais colados */}
                  <Label className="text-black shrink-0 w-24">Orçamento</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      className={cn(input, "w-36")}
                      value={Number(orcamentoTelhaExibido ?? 0)}
                      onChange={(e) => patchTelha({ orcamento: Number(e.target.value || 0) })}
                    />
                  ) : (
                    <span className="font-medium inline-block w-36">
                      <Money value={orcamentoTelhaExibido} />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5"> {/* ↓ label x input mais colados */}
                  <Label className="text-black shrink-0 w-24">Previsão</Label>
                  {isEditing ? (
                    <DateField
                      iso={value.telha?.previsao ?? null}
                      onChange={(iso) => patchTelha({ previsao: iso })}
                      className="w-36"
                    />
                  ) : (
                    <span className="font-medium inline-block w-36">
                      {value.telha?.previsao
                        ? format(new Date(value.telha.previsao), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </span>
                  )}
                </div>

                {/* Linha 2 — Telha | Unidades */}
                <div className="flex items-center gap-0.5">
                  <Label className="text-black shrink-0 w-24">Telha</Label>
                  <span className="font-semibold text-black inline-block w-36 truncate">
                    {telhaSelecionada || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  <Label className="text-black shrink-0 w-24">Unidades</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      className={cn(input, "w-36")}
                      value={(value.telha as any)?.unidades ?? totalTelhaUn ?? 0}
                      onChange={(e) => patchTelha({ unidades: Number(e.target.value || 0) } as any)}
                    />
                  ) : (
                    <span className="font-semibold inline-block w-36">
                      {totalTelhaUn ? totalTelhaUn : "—"}
                    </span>
                  )}
                </div>

                {/* Linha 3 — Área (m²) | vazio */}
                <div className="flex items-center gap-0.5">
                  <Label className="text-black shrink-0 w-24">Área (m²)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      className={cn(input, "w-36")}
                      value={value.telha?.area ?? 0}
                      onChange={(e) => patchTelha({ area: Number(e.target.value || 0) })}
                    />
                  ) : (
                    <span className="font-semibold inline-block w-36">
                      {typeof value.telha?.area === "number" ? value.telha?.area : "—"}
                    </span>
                  )}
                </div>
                <div />
              </div>
            </section>


            {/* MATERIAIS */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-semibold text-green m-0">Materiais</h3>
                {isEditing ? (
                  <>
                    <div className="rounded-xl w-[220px]">
                      <ComboboxAdd
                        widthClass="w-full"
                        placeholder="Selecionar status…"
                        buttonText={value.materiais?.status || "Selecione"}
                        items={MATERIAIS.map((s) => ({ value: s, label: s }))}
                        onSelect={(s) => patchMateriais({ status: s as PedidoStatusMateriais })}
                        showEmptyOption={false}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8 bg-green text-white hover:bg-green/90"
                      onClick={addLinhaMateriais}
                      title="Adicionar linha"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span className="text-black/70">• {value.materiais?.status || "—"}</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-x-6 gap-y-3">
                <div className="text-black/60">Item</div>
                <div className="text-black/60">Qtd</div>
                <div className="text-black/60">Total</div>
                <div className="text-black/60">Ações</div>

                {(value.materiais?.itens || []).map((it: any, idx: number) => {
                  const descricao = (it?.descricao ?? it?.nome ?? "").toString()
                  const precoUnitario = toNum(it?.precoUnitario ?? it?.preco)
                  const qtd = toNum(it?.quantidade)
                  const total = it?.total != null ? toNum(it.total) : precoUnitario * qtd

                  const patchItem = (fields: Partial<typeof it>) => {
                    const itens = [...(value.materiais?.itens || [])]
                    itens[idx] = { ...it, ...fields }
                    patchMateriais({ itens })
                  }

                  return (
                    <div key={it?.id ?? idx} className="contents">
                      {isEditing ? (
                        <>
                          <div className="min-w-0">
                            <ComboboxAdd
                              widthClass="w-full"
                              placeholder="Selecionar material…"
                              buttonText={descricao || "Selecionar material…"}
                              items={materiaisOptions}
                              colorVariant="gray-green"
                              onSelect={(val) => {
                                const novoPU = toNum(precoMateriaisMap.get(val))
                                const novoTotal = recalcTotal(novoPU, qtd, total)
                                patchItem({ descricao: val, precoUnitario: novoPU, total: novoTotal })
                              }}
                            />
                          </div>
                          <Input
                            type="number"
                            className={input}
                            value={Number(qtd)}
                            onChange={(e) => {
                              const novaQtd = Number(e.target.value || 0)
                              const novoTotal = recalcTotal(precoUnitario, novaQtd, total)
                              patchItem({ quantidade: novaQtd, total: novoTotal })
                            }}
                          />
                          <Input
                            type="number"
                            className={input}
                            value={Number(total)}
                            onChange={(e) => patchItem({ total: Number(e.target.value || 0) })}
                          />
                          <div className="flex items-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-gray-700"
                              onClick={() => removeLinhaMateriais(idx)}
                              title="Remover linha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-black">{descricao || "—"}</div>
                          <div className="font-medium text-black">{qtd || "—"}</div>
                          <div className="font-medium text-black">
                            <Money value={Number(total)} />
                          </div>
                          <div />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ANDAIMES */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-semibold text-green m-0">Andaimes</h3>
                {isEditing ? (
                  <>
                    <div className="rounded-xl w-[220px]">
                      <ComboboxAdd
                        widthClass="w-full"
                        placeholder="Selecionar status…"
                        buttonText={value.andaimes?.status || "Selecione"}
                        items={ANDAIMES.map((s) => ({ value: s, label: s }))}
                        onSelect={(s) => patchAndaimes({ status: s as PedidoStatusAndaimes })}
                        showEmptyOption={false}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8 bg-green text-white hover:bg-green/90"
                      onClick={addLinhaAndaimes}
                      title="Adicionar linha"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span className="text-black/70">• {value.andaimes?.status || "—"}</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-x-6 gap-y-3">
                <div className="text-black/60">Item</div>
                <div className="text-black/60">Qtd</div>
                <div className="text-black/60">Total</div>
                <div className="text-black/60">Ações</div>

                {(value.andaimes?.itens || []).map((it: any, idx: number) => {
                  const descricao = (it?.descricao ?? it?.nome ?? "").toString()
                  const total = Number(it?.total ?? 0)

                  const patchItem = (field: "descricao" | "quantidade" | "total", v: string | number) => {
                    const itens = [...(value.andaimes?.itens || [])]
                    itens[idx] = { ...it, [field]: v }
                    patchAndaimes({ itens })
                  }

                  return (
                    <div key={it?.id ?? idx} className="contents">
                      {isEditing ? (
                        <>
                          <Input className={input} value={descricao} onChange={(e) => patchItem("descricao", e.target.value)} />
                          <Input
                            type="number"
                            className={input}
                            value={Number(it.quantidade ?? 0)}
                            onChange={(e) => patchItem("quantidade", Number(e.target.value || 0))}
                          />
                          <Input
                            type="number"
                            className={input}
                            value={Number(total)}
                            onChange={(e) => patchItem({} as any, Number(e.target.value || 0))}
                            onBlur={(e) => patchItem("total", Number(e.currentTarget.value || 0))}
                          />
                          <div className="flex items-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-gray-700"
                              onClick={() => removeLinhaAndaimes(idx)}
                              title="Remover linha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-black">{descricao || "—"}</div>
                          <div className="font-medium text-black">{it.quantidade ?? "—"}</div>
                          <div className="font-medium text-black">
                            <Money value={Number(total)} />
                          </div>
                          <div />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA — Madeiras */}
          <div>
            <section>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-semibold text-green m-0">Madeiras</h3>
                {isEditing ? (
                  <>
                    <div className="rounded-xl w-[220px]">
                      <ComboboxAdd
                        widthClass="w-full"
                        placeholder="Selecionar status…"
                        buttonText={value.madeira?.status || "Selecione"}
                        items={PADRAO.map((s) => ({ value: s, label: s }))}
                        onSelect={(s) => patchMadeira({ status: s as PedidoStatusPadrao })}
                        showEmptyOption={false}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8 bg-green text-white hover:bg-green/90"
                      onClick={addLinhaMadeira}
                      title="Adicionar linha"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span className="text-black/70">• {value.madeira?.status || "—"}</span>
                )}
              </div>

              <div className="flex items-center gap-6 flex-wrap mb-4">
                <div className="flex items-center gap-2">
                  <Label className="text-black">Orçamento</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      className={input + " w-[160px]"}
                      value={(value.madeira as any)?.orcamento ?? 0}
                      onChange={(e) => patchMadeira({ orcamento: Number(e.target.value || 0) } as any)}
                    />
                  ) : (
                    <span className="font-medium">
                      <Money value={(value.madeira as any)?.orcamento} />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-black">Previsão</Label>
                  {isEditing ? (
                    <DateField iso={value.madeira?.previsao ?? null} onChange={(iso) => patchMadeira({ previsao: iso })} />
                  ) : (
                    <span className="font-medium">
                      {value.madeira?.previsao
                        ? format(new Date(value.madeira.previsao), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-x-6 gap-y-3 mt-4">
                <div className="col-span-1 text-black/60">Componente</div>
                <div className="col-span-1 text-black/60">Madeira</div>
                <div className="col-span-1 text-black/60">Qtd</div>
                <div className="col-span-1 text-black/60">Tamanho</div>
                <div className="col-span-1 text-black/60">Ações</div>

                {(value.madeira?.itens || []).map((it: any, idx: number) => {
                  const madeiraNome = it?.madeiraNome ?? it?.nome ?? ""
                  const pu = toNum(it?.precoUnitario)
                  const qtd = toNum(it?.quantidade)
                  const total = it?.total != null ? toNum(it.total) : recalcTotal(pu, qtd, undefined)

                  const patchItem = (fields: Partial<typeof it>) => {
                    const itens = [...(value.madeira?.itens || [])]
                    itens[idx] = { ...it, ...fields }
                    patchMadeira({ itens })
                  }

                  return (
                    <div key={it?.id ?? idx} className="contents">
                      {isEditing ? (
                        <>
                          <div className="min-w-0">
                            <ComboboxAdd
                              widthClass="w-full"
                              placeholder="Selecionar componente…"
                              buttonText={(it.componente ?? "").toString() || "Selecionar componente…"}
                              items={componentesOptions}
                              colorVariant="gray-green"
                              onSelect={(v) => patchItem({ componente: v })}
                            />
                          </div>

                          <div className="min-w-0">
                            <ComboboxAdd
                              widthClass="w-full"
                              placeholder="Selecionar madeira…"
                              buttonText={madeiraNome || "Selecionar madeira…"}
                              items={madeirasOptions}
                              colorVariant="gray-green"
                              onSelect={(val) => {
                                const novoPU = toNum(precoMadeirasMap.get(val))
                                const novoTotal = recalcTotal(novoPU, qtd, total)
                                patchItem({ madeiraNome: val, descricao: val, precoUnitario: novoPU, total: novoTotal })
                              }}
                            />
                          </div>

                          <Input
                            type="number"
                            className={input}
                            value={Number(qtd)}
                            onChange={(e) => {
                              const novaQtd = Number(e.target.value || 0)
                              const novoTotal = recalcTotal(pu, novaQtd, total)
                              patchItem({ quantidade: novaQtd, total: novoTotal })
                            }}
                          />

                          <Input
                            className={input}
                            value={String(it.tamanho ?? "")}
                            onChange={(e) => patchItem({ tamanho: e.target.value })}
                          />

                          <div className="flex items-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-gray-700"
                              onClick={() => removeLinhaMadeira(idx)}
                              title="Remover linha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-black">{it.componente || "—"}</div>
                          <div className="font-medium text-black">{madeiraNome || "—"}</div>
                          <div className="font-medium text-black">{qtd || "—"}</div>
                          <div className="font-medium text-black">{it.tamanho ?? "—"}</div>
                          <div />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
