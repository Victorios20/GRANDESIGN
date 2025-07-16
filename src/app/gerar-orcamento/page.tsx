/* ------------------------------------------------------------------
   GRANDESIGN · app/(orcamento)/gerar-orcamento/page.tsx
   ------------------------------------------------------------------
   Página única: 1) Dados pessoais • 2) Materiais • 3) Resumo
   (placeholders restaurados, máscara de telefone e cabeçalhos bege)
-------------------------------------------------------------------*/

"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Trash, Edit, Save, Calculator } from "lucide-react"

import { calcularMateriais } from "@/actions/calcular-materiais/calcularMateriais"
import type { MaterialCalculado } from "@/actions/calcular-materiais/calcularMateriais"
import { listarMateriaisPorTipo } from "@/actions/materiais-db/materiais-db"

import { PageLayout } from "@/components/ui/pageLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/* ---------- Tipos ---------- */
type Material = {
  id: number
  nome: string
  quantidade: number
  preco: number
  tamanho?: string
}
type Categoria = "madeiras" | "materiaisGerais" | "telhas"
type MateriaisPorCategoria = {
  madeiras: Material[]
  materiaisGerais: Material[]
  telhas: Material[]
}

/* ---------- Constantes ---------- */
const STORAGE_KEY = "gd_orcamento_draft"
const tiposObraPermitidos = [
  "Coluna 15",
  "Coluna 11,5",
  "Pontalete 15",
  "Pontalete 11,5",
  "Linha na Parede 15",
  "Linha na Parede 11,5",
  "Linha na Parede + Coluna 15",
  "Linha na Parede + Coluna 11,5",
  "Caramanchão 15",
  "Caramanchão 11,5",
  "Pergolado 15",
  "Pergolado 11,5",
]

/* ---------- Helpers ---------- */
const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 11)              // só dígitos
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/* ------------------------------------------------------------------ *
 *                           COMPONENTE                                *
 * ------------------------------------------------------------------ */
export default function GerarOrcamentoPage() {
  const router = useRouter()

  /* ---------- Catálogo para “Adicionar material” ---------- */
  const [catalogo, setCatalogo] = useState<{
    madeiras: { nome: string; preco: number }[]
    materiaisGerais: { nome: string; preco: number }[]
    telhas: { nome: string; preco: number }[]
  }>({ madeiras: [], materiaisGerais: [], telhas: [] })

  useEffect(() => {
    ; (async () => {
      const [mads, ges, tls] = await Promise.all([
        listarMateriaisPorTipo("madeira"),
        listarMateriaisPorTipo("geral"),
        listarMateriaisPorTipo("telha"),
      ])
      setCatalogo({
        madeiras: mads.map(m => ({ nome: m.descricao, preco: m.preco_unitario })),
        materiaisGerais: ges.map(m => ({ nome: m.descricao, preco: m.preco_unitario })),
        telhas: tls.map(m => ({ nome: m.descricao, preco: m.preco_unitario })),
      })
    })()
  }, [])

  /* ---------- Estados principais ---------- */
  const [form, setForm] = useState({ nome: "", telefone: "", cidade: "", bairro: "" })
  const [tipoObra, setTipoObra] = useState<string | null>(null)
  const [dim, setDim] = useState({ largura: 1, comprimento: 1 })
  const [materiais, setMateriais] = useState<MateriaisPorCategoria>({
    madeiras: [],
    materiaisGerais: [],
    telhas: [],
  })

  /* ---------- Draft localStorage ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw)
        setForm(d.form ?? form)
        setTipoObra(d.tipoObra ?? null)
        setDim(d.dim ?? dim)
        setMateriais(d.materiais ?? materiais)
      } catch { }
    }
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const draft = { form, tipoObra, dim, materiais }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [form, tipoObra, dim, materiais])

  /* ---------- Progresso ---------- */
  const progEtapa1 = (Object.values(form).filter(v => v.trim()).length / 4) * 33
  const progEtapa2 = materiais.madeiras.length ? 34 : 0
  const progresso = Math.round(progEtapa1 + (tipoObra ? 33 : 0) + progEtapa2)

  /* ---------- handlers ---------- */
  const onFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === "telefone" ? formatPhone(value) : value,
    }))
  }

  const clearAll = () => {
    setForm({ nome: "", telefone: "", cidade: "", bairro: "" })
    setTipoObra(null)
    setDim({ largura: 1, comprimento: 1 })
    setMateriais({ madeiras: [], materiaisGerais: [], telhas: [] })
    localStorage.removeItem(STORAGE_KEY)
  }

  /* ---------- Cálculo ---------- */
  const calcular = async () => {
    if (!tipoObra) return
    const { madeira, materiais: mats, telhas } = await calcularMateriais(
      tipoObra,
      dim.largura,
      dim.comprimento,
    )
    const mapRow = (r: MaterialCalculado, i: number): Material => ({
      id: Date.now() + i + Math.random(),
      nome: r.descricao,
      quantidade: r.quantidade,
      preco: r.preco_unitario,
      tamanho: r.tamanho,
    })
    setMateriais({
      madeiras: madeira.map(mapRow),
      materiaisGerais: mats.map(mapRow),
      telhas: telhas.map(mapRow),
    })
  }

  /* ---------- Edição inline ---------- */
  const [edit, setEdit] = useState<{ cat: Categoria; id: number } | null>(null)
  const [editData, setEditData] = useState<Omit<Material, "id">>({
    nome: "",
    quantidade: 1,
    preco: 0,
    tamanho: "",
  })
  const startEdit = (c: Categoria, m: Material) => {
    setEdit({ cat: c, id: m.id })
    setEditData({ ...m })
  }
  const saveEdit = () => {
    if (!edit) return
    setMateriais(prev => ({
      ...prev,
      [edit.cat]: prev[edit.cat].map(m =>
        m.id === edit.id ? { ...m, ...editData } : m,
      ),
    }))
    setEdit(null)
  }
  const removeItem = (c: Categoria, id: number) =>
    setMateriais(prev => ({ ...prev, [c]: prev[c].filter(m => m.id !== id) }))
  /* ---------- Adicionar ---------- */
  const addMaterial = (c: Categoria, nomeSel: string) => {
    const novo: Material = { id: Date.now(), nome: "", quantidade: 1, preco: 0, tamanho: "" }
    if (nomeSel !== "vazio") {
      const ref = catalogo[c].find(m => m.nome === nomeSel)
      if (ref) { novo.nome = ref.nome; novo.preco = ref.preco }
    }
    setMateriais(prev => ({ ...prev, [c]: [...prev[c], novo] }))
    startEdit(c, novo)
  }

  /* ---------- Totais ---------- */
  const subtotal = (a: Material[]) => a.reduce((s, m) => s + m.quantidade * m.preco, 0)
  const totMadeiras = subtotal(materiais.madeiras)
  const totMateriais = subtotal(materiais.materiaisGerais)
  const totTelhas = subtotal(materiais.telhas)

  const [totEdit, setTotEdit] = useState({
    madeiras: totMadeiras,
    materiais: totMateriais + totTelhas,
    maoDeObra: 900,
    empresaPS: 1500,
    empresaGD: 1500,
  })
  const [editingTot, setEditingTot] = useState<keyof typeof totEdit | null>(null)
  const somaTotal = Object.values(totEdit).reduce((s, v) => s + v, 0)

  /* ------------------------------ JSX ------------------------------ */
  return (
    <PageLayout links={[{ label: "Home", href: "/" }, { label: "Gerar Orçamento", href: "/gerar-orcamento" }]}>
      {/* Cabeçalho */}
      <Card className="mb-4 shadow-md rounded-2xl">
        <CardHeader className="p-4">
          <div className="flex justify-between items-start flex-col sm:flex-row">
            <div>
              <CardTitle className="text-xl font-bold">Gerar Orçamento</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Preencha as três etapas abaixo.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-700 mt-2 sm:mt-0">
              <Trash className="h-4 w-4 mr-1" /> Limpar
            </Button>
          </div>
          <Progress value={progresso} className="mt-3" />
        </CardHeader>
      </Card>

      {/* ====================== ETAPA 1 ====================== */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Etapa 1</Badge>
            <CardTitle className="text-lg">Dados Pessoais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label>Nome</Label>
            <Input name="nome" placeholder="Ex.: João Luiz" value={form.nome} onChange={onFormChange} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Telefone</Label>
            <Input name="telefone" placeholder="(85) 99999-9999" value={form.telefone} onChange={onFormChange} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Cidade</Label>
            <Input name="cidade" placeholder="Ex.: Fortaleza" value={form.cidade} onChange={onFormChange} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Bairro</Label>
            <Input name="bairro" placeholder="Ex.: Aldeota" value={form.bairro} onChange={onFormChange} />
          </div>
        </CardContent>
      </Card>

      {/* ====================== ETAPA 2 ====================== */}
      <Card className="mt-4">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Etapa 2</Badge>
            <CardTitle className="text-lg">Materiais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          {/* seleção */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex flex-col gap-1">
              <Label>Tipo de Obra</Label>
              <Select value={tipoObra ?? undefined} onValueChange={v => setTipoObra(v)}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{tiposObraPermitidos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(["largura", "comprimento"] as const).map(k => (
              <div key={k} className="flex flex-col gap-1">
                <Label className="capitalize">{k} (m)</Label>
                <Input type="number" step={0.1} value={dim[k]} onChange={e => setDim(p => ({ ...p, [k]: +e.target.value || 1 }))} className="w-32" />
              </div>
            ))}
            <Button onClick={calcular} disabled={!tipoObra}><Calculator className="h-4 w-4 mr-1" />Calcular</Button>
          </div>

          {/* Tabelas */}
          {(
            [
              ["madeiras", "Madeiras"],
              ["materiaisGerais", "Materiais Gerais"],
              ["telhas", "Telhas"],
            ] as [Categoria, string][]
          ).map(([cat, titulo]) => (
            <div key={cat} className="border rounded-lg shadow-sm">
              <div className="flex justify-between items-center px-3 py-2 bg-bege rounded-t-lg">
                <span className="font-medium text-sm">{titulo}</span>
                <Select onValueChange={v => addMaterial(cat as Categoria, v)}>
                  <SelectTrigger className="h-7 w-48 text-xs bg-cinza border-marromEscuro"><SelectValue placeholder="Adicionar material" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vazio">Novo material</SelectItem>
                    {catalogo[cat as Categoria].map(o => <SelectItem key={o.nome} value={o.nome}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow className="bg-cinza">
                      <TableHead>Descrição</TableHead>
                      {cat === "madeiras" && <TableHead className="w-24">Tamanho</TableHead>}
                      <TableHead className="w-20">Qtd</TableHead>
                      <TableHead className="w-24">Preço</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-20 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materiais[cat as Categoria].map(m => {
                      const ed = edit?.cat === cat && edit.id === m.id
                      const total = m.quantidade * m.preco
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            {ed ? <Input value={editData.nome} onChange={e => setEditData(d => ({ ...d, nome: e.target.value }))} /> : m.nome}
                          </TableCell>
                          {cat === "madeiras" && (
                            <TableCell>
                              {ed ? <Input value={editData.tamanho} onChange={e => setEditData(d => ({ ...d, tamanho: e.target.value }))} /> : m.tamanho}
                            </TableCell>
                          )}
                          <TableCell>
                            {ed ? <Input type="number" value={editData.quantidade} onChange={e => setEditData(d => ({ ...d, quantidade: +e.target.value }))} /> : m.quantidade}
                          </TableCell>
                          <TableCell>
                            {ed ? <Input type="number" step="0.01" value={editData.preco} onChange={e => setEditData(d => ({ ...d, preco: +e.target.value }))} /> : `R$ ${m.preco.toFixed(2)}`}
                          </TableCell>
                          <TableCell className="text-right">R$ {total.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            {ed ? (
                              <Button size="icon" variant="ghost" onClick={saveEdit}><Save className="h-4 w-4" /></Button>
                            ) : (
                              <Button size="icon" variant="ghost" onClick={() => startEdit(cat as Categoria, m)}><Edit className="h-4 w-4" /></Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => removeItem(cat as Categoria, m.id)}><Trash className="h-4 w-4 text-red-500" /></Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ====================== ETAPA 3 ====================== */}
      <Card className="mt-4">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Etapa 3</Badge>
            <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Totais (editáveis) */}
          <Card className="shadow-sm">
            <CardHeader className="p-3"><CardTitle className="text-sm">Totais por Categoria</CardTitle></CardHeader>
            <CardContent className="p-3">
              <Table>
                <TableBody>
                  {(Object.entries(totEdit) as [keyof typeof totEdit, number][]).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell className="capitalize">{k.replace(/([A-Z])/g, " $1")}</TableCell>
                      <TableCell>
                        {editingTot === k ? (
                          <Input type="number" value={v} onChange={e => setTotEdit(p => ({ ...p, [k]: +e.target.value }))} className="w-24 h-8" />
                        ) : `R$ ${v.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-right w-12">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingTot(editingTot === k ? null : k)}
                        >

                          {editingTot === k ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold border-t">
                    <TableCell>Total Geral</TableCell>
                    <TableCell>R$ {somaTotal.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabela fixos das telhas */}
          <Card className="shadow-sm">
            <CardHeader className="p-3"><CardTitle className="text-sm">Telhas – valores fixos</CardTitle></CardHeader>
            <CardContent className="p-3">
              <Table>
                <TableHeader><TableRow className="bg-bege"><TableHead>Tipo</TableHead><TableHead>Pix</TableHead><TableHead>10×</TableHead><TableHead>18×</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[
                    ["Romana", 9200, 1015, 591],
                    ["Colonial", 8400, 927, 539],
                    ["Americana", 9100, 1004, 584],
                  ].map(([t, a, b, c]) => (
                    <TableRow key={t as string}>
                      <TableCell>{t}</TableCell><TableCell>R$ {(+a).toFixed(0)}</TableCell>
                      <TableCell>R$ {(+b).toFixed(0)}</TableCell><TableCell>R$ {(+c).toFixed(0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Botões finais */}
      <div className="flex justify-between mt-4">
        <Button variant="secondary" onClick={() => router.push("/")}>Voltar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => console.log("Salvar rascunho")}>Salvar</Button>
          <Button onClick={() => console.log("Gerar PDF")}>Gerar Proposta</Button>
        </div>
      </div>
    </PageLayout>
  )
}
