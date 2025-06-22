// app/editar-produto/page.tsx
"use client"

import { useState } from "react"
import { Trash, X, Edit, Save } from "lucide-react"

import { PageLayout } from "@/components/ui/pageLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/* ---------- Tipos ---------- */
type Produto = { id: number; nome: string }
type Material = { id: number; nome: string; quantidade: number; preco: number }
type MaterialCategoria = "madeiras" | "materiaisGerais" | "telhas"
type MateriaisPorCategoria = {
  madeiras: Material[]
  materiaisGerais: Material[]
  telhas: Material[]
}

/* ---------- Dados simulados ---------- */
const produtosMock: Produto[] = [
  { id: 1, nome: "Caramanchão" },
  { id: 2, nome: "Cobertura" },
]

const receitasMock: Record<number, MateriaisPorCategoria> = {
  1: {
    madeiras: [
      { id: 101, nome: "Viga 3m", quantidade: 4, preco: 35 },
      { id: 102, nome: "Ripa 5m", quantidade: 6, preco: 22 },
    ],
    materiaisGerais: [
      { id: 201, nome: "Parafuso 10 mm", quantidade: 100, preco: 0.1 },
      { id: 202, nome: "Cola Madeira", quantidade: 2, preco: 18 },
    ],
    telhas: [
      { id: 301, nome: "Telha Romana", quantidade: 30, preco: 7.5 },
    ],
  },
  2: {
    madeiras: [
      { id: 103, nome: "Ripa 5m", quantidade: 8, preco: 22 },
    ],
    materiaisGerais: [
      { id: 203, nome: "Cimento 50 kg", quantidade: 3, preco: 30 },
      { id: 204, nome: "Parafuso 10 mm", quantidade: 80, preco: 0.1 },
    ],
    telhas: [
      { id: 302, nome: "Telha Colonial", quantidade: 40, preco: 8 },
    ],
  },
}

const madeirasTabela = {
  "Viga 3m": { preco: 35 },
  "Ripa 5m": { preco: 22 },
  "Tábua": { preco: 20 },
}

const materiaisGeraisTabela = {
  "Parafuso 10 mm": { preco: 0.1 },
  "Cimento 50 kg": { preco: 30 },
  "Cola Madeira": { preco: 18 },
}

const telhasTabela = {
  Romana: { preco: 7.5 },
  Colonial: { preco: 8 },
  Americana: { preco: 7.8 },
}

/* ---------- Página ---------- */
export default function EditarProdutoPage() {
  const [produtos, setProdutos] = useState<Produto[]>(produtosMock)
  const [receitas, setReceitas] = useState<Record<number, MateriaisPorCategoria>>(receitasMock)

  const [novoProduto, setNovoProduto] = useState("")
  const [editandoProdutoId, setEditandoProdutoId] = useState<number | null>(null)
  const [nomeEditando, setNomeEditando] = useState("")

  const [produtoSelecionado, setProdutoSelecionado] = useState<number | null>(null)

  const [editando, setEditando] = useState<{ categoria: MaterialCategoria; id: number } | null>(null)
  const [editData, setEditData] = useState<Omit<Material, "id">>({
    nome: "",
    quantidade: 1,
    preco: 0,
  })
  const [adicionandoId, setAdicionandoId] = useState<number | null>(null)

  /* ---------- Card Produtos ---------- */
  const handleAddProduto = () => {
    if (novoProduto.trim() === "") return
    const novo: Produto = { id: Date.now(), nome: novoProduto }
    setProdutos((prev) => [...prev, novo])
    setNovoProduto("")
  }

  const handleStartEditProduto = (id: number, nome: string) => {
    setEditandoProdutoId(id)
    setNomeEditando(nome)
  }

  const handleSaveEditProduto = (id: number) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, nome: nomeEditando } : p))
    )
    setEditandoProdutoId(null)
    setNomeEditando("")
  }

  const handleDeleteProduto = (id: number) => {
    setProdutos((prev) => prev.filter((p) => p.id !== id))
    const receitasCopia = { ...receitas }
    delete receitasCopia[id]
    setReceitas(receitasCopia)
    if (produtoSelecionado === id) setProdutoSelecionado(null)
  }

  /* ---------- Receita ---------- */
  const handleSelecionarProduto = (id: number) => {
    setProdutoSelecionado(id)
    if (!receitas[id]) {
      setReceitas((prev) => ({
        ...prev,
        [id]: { madeiras: [], materiaisGerais: [], telhas: [] },
      }))
    }
  }

  const handleAddMaterial = (categoria: MaterialCategoria, nomeSelecionado: string) => {
    if (!produtoSelecionado) return
    const newId = Date.now()
    const  nome = nomeSelecionado
    let preco = 0

    if (nomeSelecionado !== "vazio") {
      if (categoria === "madeiras") preco = madeirasTabela[nomeSelecionado as keyof typeof madeirasTabela].preco
      if (categoria === "materiaisGerais") preco = materiaisGeraisTabela[nomeSelecionado as keyof typeof materiaisGeraisTabela].preco
      if (categoria === "telhas") preco = telhasTabela[nomeSelecionado as keyof typeof telhasTabela].preco
    }

    const novo: Material = { id: newId, nome, quantidade: 1, preco }

    setReceitas((prev) => ({
      ...prev,
      [produtoSelecionado]: {
        ...prev[produtoSelecionado],
        [categoria]: [...prev[produtoSelecionado][categoria], novo],
      },
    }))

    setEditando({ categoria, id: newId })
    setEditData(novo)
    setAdicionandoId(newId)
  }

  const handleEditStart = (categoria: MaterialCategoria, m: Material) => {
    setEditando({ categoria, id: m.id })
    setEditData({ nome: m.nome, quantidade: m.quantidade, preco: m.preco })
  }

  const handleEditSave = () => {
    if (!editando || !produtoSelecionado) return
    setReceitas((prev) => ({
      ...prev,
      [produtoSelecionado]: {
        ...prev[produtoSelecionado],
        [editando.categoria]: prev[produtoSelecionado][editando.categoria].map((m) =>
          m.id === editando.id ? { ...m, ...editData } : m
        ),
      },
    }))
    setEditando(null)
    setAdicionandoId(null)
  }

  const handleRemoveMaterial = (categoria: MaterialCategoria, id: number) => {
    if (!produtoSelecionado) return
    setReceitas((prev) => ({
      ...prev,
      [produtoSelecionado]: {
        ...prev[produtoSelecionado],
        [categoria]: prev[produtoSelecionado][categoria].filter((m) => m.id !== id),
      },
    }))
    if (editando?.id === id && editando?.categoria === categoria) setEditando(null)
  }

  const materiais = produtoSelecionado ? receitas[produtoSelecionado] : undefined

  return (
    <PageLayout links={[{ label: "Home", href: "/" }, { label: "Editar Produto", href: "/editar-produto" }]}>
      {/* ---------- Card Produtos ---------- */}
      <Card className="w-full shadow-md border rounded-2xl mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">Produtos</CardTitle>
          <CardDescription className="text-sm md:text-base text-muted-foreground">
            Adicione, edite ou remova produtos
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-6 pt-0">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Novo Produto"
              value={novoProduto}
              onChange={(e) => setNovoProduto(e.target.value)}
              className="w-56"
            />
            <Button onClick={handleAddProduto} disabled={!novoProduto.trim()}>
              Adicionar
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl">
            <Table className="min-w-[280px]">
              <TableHeader>
                <TableRow className="bg-bege">
                  <TableHead className="text-xs font-medium">Nome do Produto</TableHead>
                  <TableHead className="text-center text-xs font-medium w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((p) => (
                  <TableRow key={p.id} className={`${produtoSelecionado === p.id ? "bg-bege/60" : ""}`}>
                    <TableCell className="p-2">
                      {editandoProdutoId === p.id ? (
                        <Input
                          value={nomeEditando}
                          onChange={(e) => setNomeEditando(e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <span className="text-xs">{p.nome}</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex justify-center gap-1">
                        {editandoProdutoId === p.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveEditProduto(p.id)}
                              disabled={nomeEditando.trim() === ""}
                              className="h-7 w-7"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditandoProdutoId(null)
                                setNomeEditando("")
                              }}
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
                              onClick={() => handleStartEditProduto(p.id, p.nome)}
                              className="h-7 w-7"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduto(p.id)}
                              className="h-7 w-7 text-red-500"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Card Receita ---------- */}
      <Card className="w-full shadow-md border rounded-2xl">
        <CardHeader className="p-4 md:p-6 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Receita do Produto</Badge>
            <CardTitle className="text-lg md:text-xl">Materiais do Produto</CardTitle>
          </div>
          <CardDescription className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Escolha um produto para editar sua receita
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Selecionar produto</Label>
              <Select
                value={produtoSelecionado?.toString() ?? ""}
                onValueChange={(v) => handleSelecionarProduto(Number(v))}
              >
                <SelectTrigger className="h-9 md:h-10 w-[180px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {materiais && (
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
                        disabled={!!editando || !produtoSelecionado}
                      >
                        <SelectTrigger className="h-8 w-[180px] text-xs">
                          <SelectValue placeholder="Adicionar material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vazio">Novo Produto</SelectItem>
                          {Object.keys(
                            categoria === "madeiras"
                              ? madeirasTabela
                              : categoria === "materiaisGerais"
                                ? materiaisGeraisTabela
                                : telhasTabela
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
                            <TableHead className="text-center text-xs font-medium w-16">Ações</TableHead>
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
                                      step={categoria === "madeiras" ? "0.01" : "1"}
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
                                          disabled={editData.nome.trim() === "" || editData.preco <= 0}
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
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
