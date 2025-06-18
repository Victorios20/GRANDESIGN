"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash, Plus, X, Edit, Save } from "lucide-react"

import { PageLayout } from "@/components/ui/pageLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/* ---------- Tipos ---------- */
type Material = { id: number; nome: string; quantidade: number; preco: number }
type MaterialCategoria = "madeiras" | "materiaisGerais" | "telhas"
type MateriaisPorCategoria = {
  madeiras: Material[]
  materiaisGerais: Material[]
  telhas: Material[]
}

/* ---------- Componente ---------- */
export default function GerarOrcamentoPage() {
  const router = useRouter()

  /* --- Etapa 1: dados pessoais --- */
  const [formValues, setFormValues] = useState({
    nome: "",
    telefone: "",
    cidade: "",
    bairro: "",
  })

  const totalCampos = Object.keys(formValues).length
  const camposPreenchidos = Object.values(formValues).filter((v) => v.trim() !== "").length

  /* --- Etapa 2: materiais --- */
  const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(null)
  const [materiais, setMateriais] = useState<MateriaisPorCategoria>({
    madeiras: [],
    materiaisGerais: [],
    telhas: [],
  })

  /* controle de edição */
  const [editando, setEditando] = useState<{ categoria: MaterialCategoria; id: number } | null>(null)
  const [editData, setEditData] = useState<Omit<Material, "id">>({ nome: "", quantidade: 1, preco: 0 })
  const [dimensoes, setDimensoes] = useState({ largura: 1, comprimento: 1 })
  /* --- Barra de progresso simples (Etapa 1 / Etapa 2) --- */
  const progressoEtapa1 = (camposPreenchidos / totalCampos) * 33
  const progresso = Math.round(progressoEtapa1 + (produtoSelecionado ? 33 : 0))

  /* --- Totais (Etapa 3) --- */
  const totMadeiras = materiais.madeiras.reduce((acc, m) => acc + m.quantidade * m.preco, 0)
  const totMateriaisGerais = materiais.materiaisGerais.reduce((acc, m) => acc + m.quantidade * m.preco, 0)
  const totTelhas = materiais.telhas.reduce((acc, m) => acc + m.quantidade * m.preco, 0)
  const totais = {
    madeiras: totMadeiras,
    materiais: totMateriaisGerais + totTelhas,
    maoDeObra: 900,
    empresaPS: 1500,
    empresaGD: 1500,
  }
  const somaTotal = Object.values(totais).reduce((acc, v) => acc + v, 0)

  /* preços fixos por tipo de telha */
  const telhasTabela = {
    Romana: { pix: 9200, dez: 1015, dezoito: 591 },
    Colonial: { pix: 8400, dez: 927, dezoito: 539 },
    Americana: { pix: 9100, dez: 1004, dezoito: 584 },
  }

  /* ---------- Handlers ---------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }




  const handleClearForm = () =>
    setFormValues({ nome: "", telefone: "", cidade: "", bairro: "" })

  /* selecionar produto => carrega 3 listas mockadas */
  const handleSelecionarProduto = (value: string) => {
    setProdutoSelecionado(value)
    if (value === "caramanchao") {
      setMateriais({
        madeiras: [{ id: 1, nome: "Viga 3m", quantidade: 4, preco: 35 }],
        materiaisGerais: [{ id: 1, nome: "Parafuso 10 mm", quantidade: 100, preco: 0.1 }],
        telhas: [{ id: 1, nome: "Telha Romana", quantidade: 30, preco: 7.5 }],
      })
    } else if (value === "cobertura") {
      setMateriais({
        madeiras: [{ id: 1, nome: "Ripa 5 m", quantidade: 6, preco: 22 }],
        materiaisGerais: [{ id: 1, nome: "Cimento 50 kg", quantidade: 3, preco: 30 }],
        telhas: [{ id: 1, nome: "Telha Colonial", quantidade: 40, preco: 8 }],
      })
    }
  }

  /* Edição */
  const handleEditStart = (categoria: MaterialCategoria, m: Material) => {
    setEditando({ categoria, id: m.id })
    setEditData({ nome: m.nome, quantidade: m.quantidade, preco: m.preco })
  }
  const handleEditSave = () => {
    if (!editando) return
    setMateriais((prev) => ({
      ...prev,
      [editando.categoria]: prev[editando.categoria].map((m) => (m.id === editando.id ? { ...m, ...editData } : m)),
    }))
    setEditando(null)
  }

  /* Adicionar */
  const handleAddMaterial = (categoria: MaterialCategoria) => {
    const newId = Date.now()
    const novo: Material = { id: newId, nome: "", quantidade: 1, preco: 0 }
    setMateriais((prev) => ({
      ...prev,
      [categoria]: [...prev[categoria], novo],
    }))
    setEditando({ categoria, id: newId })
    setEditData(novo)
  }

  const handleSalvar = () => {
    // por enquanto não faz nada
  }


  /* Remover */
  const handleRemoveMaterial = (categoria: MaterialCategoria, id: number) => {
    setMateriais((prev) => ({
      ...prev,
      [categoria]: prev[categoria].filter((m) => m.id !== id),
    }))
    if (editando?.id === id && editando?.categoria === categoria) setEditando(null)
  }

  /* ---------- Render ---------- */
  return (
    <PageLayout
      links={[
        { label: "Home", href: "/" },
        { label: "Gerar Orçamento", href: "/gerar-orcamento" },
      ]}
    >
      {/* Cabeçalho principal - RESPONSIVO */}
      <Card className="w-full shadow-md border rounded-2xl mb-4 md:mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">Gerar Orçamento</CardTitle>
          <CardDescription className="text-sm md:text-base text-muted-foreground">
            Preencha as três etapas abaixo.
          </CardDescription>
          <Progress value={progresso} className="mt-3 md:mt-4" />
        </CardHeader>
      </Card>

      {/* ----------- Etapa 1 (Dados Pessoais) - RESPONSIVO ----------- */}
      <Card className="w-full shadow-md border rounded-2xl">
        <CardHeader className="p-4 md:p-6">
          {/* linha superior: título + botão - RESPONSIVO */}
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

          {/* subtítulo */}
          <CardDescription className="text-xs md:text-sm text-muted-foreground mt-1">
            Preencha com os dados do cliente
          </CardDescription>
        </CardHeader>

        {/* formulário - GRID RESPONSIVO */}
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




      {/* ----------------- Etapa 2 ----------------- */}
      <Card className="w-full shadow-md border rounded-2xl mt-4 md:mt-6">
        <CardHeader className="p-4 md:p-6 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Etapa 2</Badge>
            <CardTitle className="text-lg md:text-xl">Dados do Serviço</CardTitle>
          </div>

          <CardDescription className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Selecione o produto e adicione os materiais necessários.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-6 pt-2">
          {/* seletor + dimensões */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-6">
            {/* Produto */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Selecionar produto</Label>
              <Select
                value={produtoSelecionado ?? undefined}
                onValueChange={handleSelecionarProduto}
              >
                <SelectTrigger
                  className="h-9 md:h-10 w-[140px]"
                  disabled={!!editando}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caramanchao">Caramanchão</SelectItem>
                  <SelectItem value="cobertura">Cobertura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Largura & Comprimento */}
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
          </div>

          {/* Tabelas de materiais */}
          <div className="flex flex-col items-center gap-4 md:gap-6">
            {(
              [
                ["madeiras", "Madeiras"],
                ["materiaisGerais", "Materiais Gerais"],
                ["telhas", "Telhas"],
              ] as [MaterialCategoria, string][]
            ).map(([categoria, titulo]) => (
              <Card
                key={categoria}
                className="w-full max-w-[800px] mx-auto border shadow-sm"
              >
                <CardHeader className="p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-sm md:text-base">{titulo}</CardTitle>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAddMaterial(categoria)}
                      disabled={!!editando || !produtoSelecionado}
                      className="h-8 text-xs self-start sm:self-auto"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
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
                          const total =
                            quantidade * preco *
                            (dimensoes.largura * dimensoes.comprimento || 1);
                          const emEdicao =
                            editando?.id === id && editando.categoria === categoria;

                          return (
                            <TableRow key={id}>
                              {/* Nome */}
                              <TableCell className="p-2">
                                {emEdicao ? (
                                  <Input
                                    value={editData.nome}
                                    onChange={(e) =>
                                      setEditData((d) => ({
                                        ...d,
                                        nome: e.target.value,
                                      }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  <span className="text-xs">{nome}</span>
                                )}
                              </TableCell>
                              {/* Qtd / Metros */}
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
                              {/* Preço */}
                              <TableCell className="p-2">
                                {emEdicao ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editData.preco}
                                    onChange={(e) =>
                                      setEditData((d) => ({
                                        ...d,
                                        preco: +e.target.value,
                                      }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  <span className="text-xs">
                                    R$ {preco.toFixed(2)}
                                  </span>
                                )}
                              </TableCell>
                              {/* Total */}
                              <TableCell className="p-2 text-xs">
                                R$ {total.toFixed(2)}
                              </TableCell>
                              {/* Ações */}
                              <TableCell className="p-2">
                                <div className="flex justify-center gap-1">
                                  {emEdicao ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleEditSave}
                                        disabled={
                                          editData.nome.trim() === "" ||
                                          editData.preco <= 0
                                        }
                                        className="h-7 w-7"
                                      >
                                        <Save className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditando(null)}
                                        className="h-7 w-7"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
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
                                        onClick={() =>
                                          handleRemoveMaterial(categoria, id)
                                        }
                                        className="h-7 w-7 text-red-500"
                                      >
                                        <Trash className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
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



      {/* ----------------- Etapa 3 - RESPONSIVO ----------------- */}
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
                      <TableRow>
                        <TableCell className="text-xs md:text-sm">Madeiras</TableCell>
                        <TableCell className="text-xs md:text-sm font-medium">
                          R$ {totais.madeiras.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs md:text-sm">Materiais</TableCell>
                        <TableCell className="text-xs md:text-sm font-medium">
                          R$ {totais.materiais.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs md:text-sm">Mão de Obra</TableCell>
                        <TableCell className="text-xs md:text-sm font-medium">
                          R$ {totais.maoDeObra.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs md:text-sm">Empresa PS</TableCell>
                        <TableCell className="text-xs md:text-sm font-medium">
                          R$ {totais.empresaPS.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs md:text-sm">Empresa GD</TableCell>
                        <TableCell className="text-xs md:text-sm font-medium">
                          R$ {totais.empresaGD.toFixed(2)}
                        </TableCell>
                      </TableRow>
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
                      {Object.entries(telhasTabela).map(([tipo, p]) => (
                        <TableRow key={tipo}>
                          <TableCell className="text-xs md:text-sm">{tipo}</TableCell>
                          <TableCell className="text-xs md:text-sm">R$ {p.pix.toFixed(2)}</TableCell>
                          <TableCell className="text-xs md:text-sm">R$ {p.dez.toFixed(2)}</TableCell>
                          <TableCell className="text-xs md:text-sm">R$ {p.dezoito.toFixed(2)}</TableCell>
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

      {/* Botões finais - RESPONSIVOS */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-4 md:mt-6">
        <Button
          variant="secondary"
          onClick={() => router.push("/")}
          className="h-9 md:h-10 order-2 sm:order-1"
        >
          Voltar
        </Button>

        {/* Botões à direita agrupados */}
        <div className="flex gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            onClick={handleSalvar}
            className="h-9 md:h-10"
          >
            Salvar
          </Button>
          <Button
            variant="default"
            onClick={() => console.log("Gerar orçamento:", formValues, produtoSelecionado, materiais)}
            className="h-9 md:h-10"
          >
            Gerar Orçamento
          </Button>
        </div>
      </div>

    </PageLayout>
  )
}
