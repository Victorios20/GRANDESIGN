"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { salvarProposta, atualizarProposta, type PropostaInput } from "@/actions/proposta-servico"
import { calcularValorFinalProposta } from "@/lib/proposta-utils"
import { formatCurrency } from "@/lib/financeiro-utils"

type ClienteOption = { id: number; nome: string }

export type PropostaInitial = Partial<PropostaInput> & { id?: number }

export default function PropostaForm({ clientes, initial }: { clientes: ClienteOption[]; initial?: PropostaInitial }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState(initial?.titulo ?? "")
  const [clienteId, setClienteId] = useState(initial?.cliente_id ? String(initial.cliente_id) : "")
  const [descricao, setDescricao] = useState(initial?.descricao_servico ?? "")
  const [dimensoes, setDimensoes] = useState(initial?.dimensoes ?? "")
  const [itens, setItens] = useState<string[]>(initial?.itens && initial.itens.length > 0 ? initial.itens : [""])
  const [maoObra, setMaoObra] = useState(initial?.custo_mao_obra ?? 0)
  const [materiais, setMateriais] = useState(initial?.custo_materiais ?? 0)
  const [frete, setFrete] = useState(initial?.custo_frete ?? 0)
  const [lucro, setLucro] = useState(initial?.lucro ?? 0)
  const [formaPagamento, setFormaPagamento] = useState(initial?.forma_pagamento ?? "")
  const [prazo, setPrazo] = useState(initial?.prazo_execucao ?? "")
  const [validade, setValidade] = useState(initial?.validade ?? "")
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "")
  const [saving, setSaving] = useState(false)

  const valorFinal = useMemo(
    () => calcularValorFinalProposta({ maoObra, materiais, frete, lucro }),
    [maoObra, materiais, frete, lucro],
  )
  const clienteItems = useMemo(() => clientes.map((c) => ({ value: String(c.id), label: c.nome })), [clientes])
  const canSave = Boolean(titulo.trim() && clienteId && descricao.trim())

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload: PropostaInput = {
        titulo,
        cliente_id: Number(clienteId),
        descricao_servico: descricao,
        dimensoes: dimensoes || null,
        itens: itens.map((i) => i.trim()).filter(Boolean),
        custo_mao_obra: maoObra,
        custo_materiais: materiais,
        custo_frete: frete,
        lucro,
        forma_pagamento: formaPagamento || null,
        prazo_execucao: prazo || null,
        validade: validade || null,
        observacoes: observacoes || null,
        status: "RASCUNHO",
      }
      const res = initial?.id
        ? await atualizarProposta(initial.id, payload)
        : await salvarProposta(payload)
      toast.success("Proposta salva")
      router.push(`/proposta-servico/detalhes/${res.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold">{initial?.id ? "Editar" : "Nova"} proposta de serviço</h1>

      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Reforma de coberta — Sra. Iara" />
        </div>
        <div className="space-y-2">
          <Label>Cliente</Label>
          <SearchableSelect value={clienteId} onValueChange={setClienteId} items={clienteItems}
            placeholder="Selecionar cliente" searchPlaceholder="Buscar cliente" />
        </div>
        <div className="space-y-2">
          <Label>Descrição do serviço</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5}
            placeholder="Execução completa da cobertura..." />
        </div>
        <div className="space-y-2">
          <Label>Dimensões (opcional)</Label>
          <Input value={dimensoes ?? ""} onChange={(e) => setDimensoes(e.target.value)} placeholder="5,00 m x 2,00 m" />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Label>Material incluso (aparece no PDF)</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setItens((v) => [...v, ""])}>
            <Plus className="mr-1 size-4" /> Adicionar item
          </Button>
        </div>
        {itens.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input value={item} onChange={(e) => setItens((v) => v.map((x, i) => (i === idx ? e.target.value : x)))}
              placeholder="Ex: Linha 10cm (Linha na Parede)" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setItens((v) => v.filter((_, i) => i !== idx))}
              disabled={itens.length === 1}>
              <Trash2 className="size-4 text-red-600" />
            </Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-4 p-4">
        <Label className="text-base font-semibold">Cálculo do valor (interno — não vai para o PDF)</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Mão de obra</Label>
            <Input type="number" step="0.01" min="0" value={maoObra} onChange={(e) => setMaoObra(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Materiais</Label>
            <Input type="number" step="0.01" min="0" value={materiais} onChange={(e) => setMateriais(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Frete</Label>
            <Input type="number" step="0.01" min="0" value={frete} onChange={(e) => setFrete(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Lucro</Label>
            <Input type="number" step="0.01" min="0" value={lucro} onChange={(e) => setLucro(Number(e.target.value))} /></div>
        </div>
        <div className="rounded-xl border border-[#E8D9BC] bg-[#FFF9EE] p-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#2C201B]/45">Valor final</p>
          <p className="mt-1 text-2xl font-semibold text-[#2E7D32]">{formatCurrency(valorFinal)}</p>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <Label className="text-base font-semibold">Condições comerciais</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2"><Label>Forma de pagamento</Label>
            <Input value={formaPagamento ?? ""} onChange={(e) => setFormaPagamento(e.target.value)} placeholder="60% entrada, 40% no término" /></div>
          <div className="space-y-2"><Label>Prazo de execução</Label>
            <Input value={prazo ?? ""} onChange={(e) => setPrazo(e.target.value)} placeholder="Até 20 dias" /></div>
          <div className="space-y-2"><Label>Validade</Label>
            <Input type="date" value={validade ?? ""} onChange={(e) => setValidade(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Observações (opcional)</Label>
          <Textarea value={observacoes ?? ""} onChange={(e) => setObservacoes(e.target.value)} rows={3} /></div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
        <Button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</> : "Salvar proposta"}
        </Button>
      </div>
    </div>
  )
}
