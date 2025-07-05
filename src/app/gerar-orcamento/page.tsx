"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trash, X, Edit, Save, Calculator } from "lucide-react"

import { calcularMateriais } from "@/actions/calcular-materiais/calcularMateriais"

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
type Material = { id: number; nome: string; quantidade: number; preco: number }
type MaterialCategoria = "madeiras" | "materiaisGerais" | "telhas"
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

/* ---------- Dados simulados (para novo material manual) ---------- */
const madeirasTabela = {
  "Viga 3m": { preco: 35 },
  "Ripa 5m": { preco: 22 },
  "Tábua": { preco: 20 },
}

const materiaisGeraisTabela = {
  "Parafuso 10mm": { preco: 0.1 },
  "Cimento 50kg": { preco: 30 },
  "Cola Madeira": { preco: 18 },
}

const telhasTabela = {
  Romana: { preco: 7.5 },
  Colonial: { preco: 8 },
  Americana: { preco: 7.8 },
}

/* ---------- Componente ---------- */
export default function GerarOrcamentoPage() {
  const router = useRouter()

  /* ---------- Estados ---------- */
  const [formValues, setFormValues] = useState({
    nome: "",
    telefone: "",
    cidade: "",
    bairro: "",
  })
  const [tipoObra, setTipoObra] = useState<string | null>(null)
  const [dimensoes, setDimensoes] = useState({ largura: 1, comprimento: 1 })
  const [materiais, setMateriais] = useState<MateriaisPorCategoria>({
    madeiras: [],
    materiaisGerais: [],
    telhas: [],
  })

  /* edição inline */
  const [editando, setEditando] = useState<{ categoria: MaterialCategoria; id: number } | null>(null)
  const [editData, setEditData] = useState<Omit<Material, "id">>({
    nome: "",
    quantidade: 1,
    preco: 0,
  })
  const [adicionandoId, setAdicionandoId] = useState<number | null>(null)

  /* progress bar */
  const totalCampos = Object.keys(formValues).length
  const camposPreenchidos = Object.values(formValues).filter((v) => v.trim() !== "").length
  const progressoEtapa1 = (camposPreenchidos / totalCampos) * 33
  const progresso = Math.round(progressoEtapa1 + (tipoObra ? 33 : 0))

  /* ---------- Persistência localStorage ---------- */
  /* carregar rascunho */
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setFormValues(data.formValues ?? formValues)
        setTipoObra(data.tipoObra ?? null)
        setDimensoes(data.dimensoes ?? dimensoes)
        setMateriais(data.materiais ?? materiais)
      } catch (e) {
        console.error("Rascunho corrompido:", e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* salvar rascunho sempre que algo importante mudar */
  useEffect(() => {
    if (typeof window === "undefined") return
    const draft = { formValues, tipoObra, dimensoes, materiais }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [formValues, tipoObra, dimensoes, materiais])

  /* limpar tudo + rascunho */
  const handleClearForm = () => {
    setFormValues({ nome: "", telefone: "", cidade: "", bairro: "" })
    setTipoObra(null)
    setDimensoes({ largura: 1, comprimento: 1 })
    setMateriais({ madeiras: [], materiaisGerais: [], telhas: [] })
    localStorage.removeItem(STORAGE_KEY)
  }

  /* ---------- handlers gerais ---------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelecionarTipoObra = (value: string) => {
    setTipoObra(value)
    setMateriais({ madeiras: [], materiaisGerais: [], telhas: [] })
  }

  /* ---------- Cálculo automático ---------- */
  const handleCalcular = async () => {
    if (!tipoObra) return

    const lista = await calcularMateriais(tipoObra, dimensoes.largura, dimensoes.comprimento)

    const madeiras: Material[] = []
    const materiaisGerais: Material[] = []
    const telhas: Material[] = []

    lista.forEach((m) => {
      const base: Material = {
        id: m.id ?? Date.now() + Math.random(),
        nome: m.descricao,
        quantidade: m.quantidade,
        preco: m.preco_unitario,
      }

      if (m.tipo === "madeira") {
        madeiras.push(base)
      } else if (m.tipo === "telha" || m.descricao.toLowerCase().includes("telha")) {
        telhas.push(base)
      } else {
        materiaisGerais.push(base)
      }
    })

    setMateriais({ madeiras, materiaisGerais, telhas })
  }

  /* ---------- edição inline ---------- */
  const handleEditStart = (categoria: MaterialCategoria, m: Material) => {
    setEditando({ categoria, id: m.id })
    setEditData({ nome: m.nome, quantidade: m.quantidade, preco: m.preco })
  }

  const handleEditSave = () => {
    if (!editando) return
    setMateriais((prev) => ({
      ...prev,
      [editando.categoria]: prev[editando.categoria].map((m) =>
        m.id === editando.id ? { ...m, ...editData } : m,
      ),
    }))
    setEditando(null)
  }

  /* ---------- adicionar manual ---------- */
  const handleAddMaterial = (categoria: MaterialCategoria, nomeSelecionado: string) => {
    const newId = Date.now()
    let nome = ""
    let preco = 0

    if (nomeSelecionado !== "vazio") {
      if (categoria === "madeiras") {
        nome = nomeSelecionado
        preco = madeirasTabela[nomeSelecionado as keyof typeof madeirasTabela].preco
      }
      if (categoria === "materiaisGerais") {
        nome = nomeSelecionado
        preco =
          materiaisGeraisTabela[nomeSelecionado as keyof typeof materiaisGeraisTabela].preco
      }
      if (categoria === "telhas") {
        nome = nomeSelecionado
        preco = telhasTabela[nomeSelecionado as keyof typeof telhasTabela].preco
      }
    }

    const novo: Material = { id: newId, nome, quantidade: 1, preco }
    setMateriais((prev) => ({
      ...prev,
      [categoria]: [...prev[categoria], novo],
    }))
    setEditando({ categoria, id: newId })
    setEditData(novo)
    setAdicionandoId(newId)
  }

  const handleRemoveMaterial = (categoria: MaterialCategoria, id: number) => {
    setMateriais((prev) => ({
      ...prev,
      [categoria]: prev[categoria].filter((m) => m.id !== id),
    }))
    if (editando?.id === id && editando?.categoria === categoria) setEditando(null)
  }

  /* ---------- totais / etapa 3 (sem persistir por enquanto) ---------- */
  const totMadeiras = materiais.madeiras.reduce((acc, m) => acc + m.quantidade * m.preco, 0)
  const totMateriaisGerais = materiais.materiaisGerais.reduce((acc, m) => acc + m.quantidade * m.preco, 0)
  const totTelhas = materiais.telhas.reduce((acc, m) => acc + m.quantidade * m.preco, 0)

  const [totaisEditaveis, setTotaisEditaveis] = useState({
    madeiras: totMadeiras,
    materiais: totMateriaisGerais + totTelhas,
    maoDeObra: 900,
    empresaPS: 1500,
    empresaGD: 1500,
  })
  const [editandoTotal, setEditandoTotal] = useState<keyof typeof totaisEditaveis | null>(null)
  const somaTotal = Object.values(totaisEditaveis).reduce((acc, v) => acc + v, 0)

  const telhasPagamentoTabela = {
    Romana: { pix: 9200, dez: 1015, dezoito: 591 },
    Colonial: { pix: 8400, dez: 927, dezoito: 539 },
    Americana: { pix: 9100, dez: 1004, dezoito: 584 },
  }

  const handleSalvar = () => {
    // Ação de salvar futura
  }

  /* ---------- JSX ---------- */
  return (
    <PageLayout
      links={[
        { label: "Home", href: "/" },
        { label: "Gerar Orçamento", href: "/gerar-orcamento" },
      ]}
    >
      {/* -------- Cabeçalho principal -------- */}
      <Card className="w-full shadow-md border rounded-2xl mb-4 md:mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
            Gerar Orçamento
          </CardTitle>
          <CardDescription className="text-sm md:text-base text-muted-foreground">
            Preencha as três etapas abaixo.
          </CardDescription>
          <Progress value={progresso} className="mt-3 md:mt-4" />
        </CardHeader>
      </Card>

      {/* -------- Etapa 1 – Dados Pessoais -------- */}
      <Card className="w-full shadow-md border rounded-2xl">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Etapa 1
              </Badge>
              <CardTitle className="text-lg md:text-xl">Dados Pessoais</CardTitle>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearForm}
              className="text-red-500 hover:text-red-700 self-start sm:self-auto"
            >
              <Trash className="w-4 h-4 mr-1" /> Limpar
            </Button>
          </div>

          <CardDescription className="text-xs md:text-sm text-muted-foreground mt-1">
            Preencha com os dados do cliente
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
            {(["nome", "telefone", "cidade", "bairro"] as const).map((id) => (
              <div key={id} className="flex flex-col gap-1.5">
                <Label htmlFor={id} className="text-sm font-medium">
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </Label>
                <Input
                  id={id}
                  name={id}
                  placeholder={`Digite o ${id}`}
                  value={formValues[id]}
                  onChange={handleChange}
                  className="h-9 md:h-10"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* -------- Etapa 2 – Dados do Serviço -------- */}
      <Card className="w-full shadow-md border rounded-2xl mt-4 md:mt-6">
        <CardHeader className="p-4 md:p-6 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Etapa 2
            </Badge>
            <CardTitle className="text-lg md:text-xl">Dados do Serviço</CardTitle>
          </div>
          <CardDescription className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Selecione o tipo de obra, informe as dimensões e clique em <i>Calcular</i>.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-6 pt-2">
          {/* Tipo de obra + dimensões + botão calcular */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-6">
            {/* tipo de obra */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Tipo de Obra</Label>
              <Select value={tipoObra ?? undefined} onValueChange={handleSelecionarTipoObra}>
                <SelectTrigger className="h-9 md:h-10 w-[240px]" disabled={!!editando}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-[210px] overflow-y-auto">
                  {tiposObraPermitidos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* dimensões */}
            <div className="flex gap-6">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Largura&nbsp;(m)</Label>
                <Input
                  type="number"
                  min={1}
                  value={dimensoes.largura}
                  onChange={(e) =>
                    setDimensoes((d) => ({ ...d, largura: +e.target.value }))
                  }
                  disabled={!!editando}
                  className="h-8 text-xs w-[140px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Comprimento&nbsp;(m)</Label>
                <Input
                  type="number"
                  min={1}
                  value={dimensoes.comprimento}
                  onChange={(e) =>
                    setDimensoes((d) => ({ ...d, comprimento: +e.target.value }))
                  }
                  disabled={!!editando}
                  className="h-8 text-xs w-[140px]"
                />
              </div>
            </div>

            {/* calcular */}
            <Button
              size="sm"
              onClick={handleCalcular}
              disabled={!tipoObra || !!editando}
              className="gap-1"
            >
              <Calculator className="w-4 h-4" />
              Calcular
            </Button>
          </div>

          {/* Tabelas de Materiais */}
          <div className="flex flex-col items-center gap-4 md:gap-6">
            {(
              [
                ["madeiras", "Madeiras"],
                ["materiaisGerais", "Materiais Gerais"],
                ["telhas", "Telhas"],
              ] as [MaterialCategoria, string][]
            ).map(([categoria, titulo]) => (
              <Card key={categoria} className="w-full mx-auto border shadow-sm">
                <CardHeader className="p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-sm md:text-base">{titulo}</CardTitle>
                    <Select
                      onValueChange={(value) => handleAddMaterial(categoria, value)}
                      disabled={!!editando || !tipoObra}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-xs">
                        <SelectValue placeholder="Adicionar material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vazio">Novo Material</SelectItem>
                        {Object.keys(
                          categoria === "madeiras"
                            ? madeirasTabela
                            : categoria === "materiaisGerais"
                              ? materiaisGeraisTabela
                              : telhasTabela,
                        ).map((nome) => (
                          <SelectItem key={nome} value={nome}>
                            {nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="overflow-x-auto rounded-xl">
                    <Table className="min-w-[280px]">
                      <TableHeader>
                        <TableRow className="bg-bege">
                          <TableHead className="text-xs font-medium">Nome</TableHead>
                          <TableHead className="text-xs font-medium">
                            {categoria === "madeiras" ? "Metros" : "Qtd"}
                          </TableHead>
                          <TableHead className="text-xs font-medium">Preço</TableHead>
                          <TableHead className="text-xs font-medium">Total</TableHead>
                          <TableHead className="text-center text-xs font-medium w-16">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materiais[categoria].map(({ id, nome, quantidade, preco }) => {
                          const total = quantidade * preco
                          const emEdicao = editando?.id === id && editando.categoria === categoria
                          const isAdicionando = adicionandoId === id

                          return (
                            <TableRow key={id}>
                              <TableCell className="p-2">
                                {emEdicao ? (
                                  <Input
                                    value={editData.nome}
                                    onChange={(e) =>
                                      setEditData((d) => ({ ...d, nome: e.target.value }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  <span className="text-xs">{nome}</span>
                                )}
                              </TableCell>
                              <TableCell className="p-2">
                                {emEdicao ? (
                                  <Input
                                    type="number"
                                    value={editData.quantidade}
                                    onChange={(e) =>
                                      setEditData((d) => ({
                                        ...d,
                                        quantidade: +e.target.value,
                                      }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  <span className="text-xs">{quantidade}</span>
                                )}
                              </TableCell>
                              <TableCell className="p-2">
                                {emEdicao ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editData.preco}
                                    onChange={(e) =>
                                      setEditData((d) => ({ ...d, preco: +e.target.value }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  <span className="text-xs">R$ {preco.toFixed(2)}</span>
                                )}
                              </TableCell>
                              <TableCell className="p-2 text-xs">
                                R$ {total.toFixed(2)}
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="flex justify-center gap-1">
                                  {emEdicao ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleEditSave}
                                        disabled={
                                          editData.nome.trim() === "" || editData.preco <= 0
                                        }
                                        className="h-7 w-7"
                                      >
                                        <Save className="w-3 h-3" />
                                      </Button>
                                      {isAdicionando ? (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoveMaterial(categoria, id)}
                                          className="h-7 w-7 text-red-500"
                                        >
                                          <Trash className="w-3 h-3" />
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setEditando(null)
                                            setAdicionandoId(null)
                                          }}
                                          className="h-7 w-7"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={!!editando}
                                        onClick={() =>
                                          handleEditStart(categoria, {
                                            id,
                                            nome,
                                            quantidade,
                                            preco,
                                          })
                                        }
                                        className="h-7 w-7"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={!!editando}
                                        onClick={() => handleRemoveMaterial(categoria, id)}
                                        className="h-7 w-7 text-red-500"
                                      >
                                        <Trash className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Etapa 3 – Resumo  (sem alterações) */}
      <Card className="w-full shadow-md border rounded-2xl mt-4 md:mt-6">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Etapa 3
            </Badge>
            <CardTitle className="text-lg md:text-xl">Resumo do Pedido</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {/* Totais por categoria - RESPONSIVO */}
            <Card className="border shadow-sm">
              <CardHeader className="p-3 md:p-4">
                <CardTitle className="text-sm md:text-base">Totais por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      {Object.entries(totaisEditaveis).map(([categoria, valor]) => (
                        <TableRow key={categoria}>
                          <TableCell className="text-xs md:text-sm capitalize">
                            {categoria.replace(/([A-Z])/g, " $1")}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {editandoTotal === categoria ? (
                              <Input
                                type="number"
                                value={valor}
                                onChange={(e) =>
                                  setTotaisEditaveis((prev) => ({
                                    ...prev,
                                    [categoria]: parseFloat(e.target.value),
                                  }))
                                }
                                className="max-w-[100px] h-8"
                              />
                            ) : (
                              `R$ ${valor.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setEditandoTotal(
                                  editandoTotal === categoria ? null : (categoria as keyof typeof totaisEditaveis)
                                )
                              }
                              className="h-7 w-7"
                            >
                              {editandoTotal === categoria ? (
                                <Save className="w-3 h-3" />
                              ) : (
                                <Edit className="w-3 h-3" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell className="text-sm md:text-base">Total Geral</TableCell>
                        <TableCell className="text-sm md:text-base">R$ {somaTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Tabela fixa de formas de pagamento para telhas - RESPONSIVO */}
            <Card className="border shadow-sm">
              <CardHeader className="p-3 md:p-4">
                <CardTitle className="text-sm md:text-base">Valores fixos – Telhas</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[280px]">
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-xs font-medium">Tipo</TableHead>
                        <TableHead className="text-xs font-medium">Pix</TableHead>
                        <TableHead className="text-xs font-medium">10×</TableHead>
                        <TableHead className="text-xs font-medium">18×</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(telhasPagamentoTabela).map(([tipo, p]) => (
                        <TableRow key={tipo}>
                          <TableCell>{tipo}</TableCell>
                          <TableCell>R$ {p.pix.toFixed(2)}</TableCell>
                          <TableCell>R$ {p.dez.toFixed(2)}</TableCell>
                          <TableCell>R$ {p.dezoito.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}

                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Botões finais */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-4 md:mt-6">
        <Button variant="secondary" onClick={() => router.push("/")} className="h-9 md:h-10 order-2 sm:order-1">
          Voltar
        </Button>
        <div className="flex gap-2 order-1 sm:order-2">
          <Button variant="outline" onClick={handleSalvar} className="h-9 md:h-10">
            Salvar
          </Button>
          <Button
            variant="default"
            onClick={() =>
              console.log("Gerar orçamento:", formValues, tipoObra, dimensoes, materiais)
            }
            className="h-9 md:h-10"
          >
            Gerar Orçamento
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}
