"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash, Plus, X, Edit, Save } from "lucide-react"

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

/* ---------- Componente ---------- */
export default function GerarOrcamentoPage() {
    const router = useRouter()

    /* --- Etapa 1: dados pessoais --- */
    const [formValues, setFormValues] = useState({
        nome: "",
        telefone: "",
        email: "",
        cidade: "",
        bairro: "",
        endereco: "",
    })
    const totalCampos = Object.keys(formValues).length
    const camposPreenchidos = Object.values(formValues).filter(v => v.trim() !== "").length

    /* --- Etapa 2: materiais --- */
    const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(null)
    const [materiais, setMateriais] = useState<MateriaisPorCategoria>({
        madeiras: [],
        materiaisGerais: [],
        telhas: [],
    })

    /* controle de edição */
    const [editando, setEditando] =
        useState<{ categoria: MaterialCategoria; id: number } | null>(null)
    const [editData, setEditData] =
        useState<Omit<Material, "id">>({ nome: "", quantidade: 1, preco: 0 })

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
        setFormValues(prev => ({ ...prev, [name]: value }))
    }

    const handleClearForm = () =>
        setFormValues({ nome: "", telefone: "", email: "", cidade: "", bairro: "", endereco: "" })

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
        setMateriais(prev => ({
            ...prev,
            [editando.categoria]: prev[editando.categoria].map(m =>
                m.id === editando.id ? { ...m, ...editData } : m,
            ),
        }))
        setEditando(null)
    }

    /* Adicionar */
    const handleAddMaterial = (categoria: MaterialCategoria) => {
        const newId = Date.now()
        const novo: Material = { id: newId, nome: "", quantidade: 1, preco: 0 }
        setMateriais(prev => ({
            ...prev,
            [categoria]: [...prev[categoria], novo],
        }))
        setEditando({ categoria, id: newId })
        setEditData(novo)
    }

    /* Remover */
    const handleRemoveMaterial = (categoria: MaterialCategoria, id: number) => {
        setMateriais(prev => ({
            ...prev,
            [categoria]: prev[categoria].filter(m => m.id !== id),
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
            {/* Cabeçalho principal */}
            <Card className="w-full shadow-md border rounded-2xl mb-6">
                <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl font-bold">
                        Gerar Orçamento
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Preencha as três etapas abaixo.
                    </CardDescription>
                    <Progress value={progresso} className="mt-4" />
                </CardHeader>
            </Card>

            {/* ----------- Etapa 1 (Dados Pessoais) ----------- */}
            <Card className="w-full shadow-md border rounded-2xl">
                {/* cabeçalho com botão à direita */}
                <CardHeader>
                    {/* linha superior: título + botão */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">Etapa 1</Badge>
                            <CardTitle>Dados Pessoais</CardTitle>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearForm}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash className="w-4 h-4 mr-1" /> Limpar
                        </Button>
                    </div>

                    {/* subtítulo abaixo, sem alinhar ao botão */}
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                        Preencha com os dados do cliente
                    </CardDescription>
                </CardHeader>


                {/* formulário */}
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {Object.keys(formValues).map(id => (
                            <div key={id} className="flex flex-col gap-1.5">
                                <Label htmlFor={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</Label>
                                <Input
                                    id={id}
                                    name={id}
                                    placeholder={`Digite o ${id}`}
                                    value={formValues[id as keyof typeof formValues]}
                                    onChange={handleChange}
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ----------------- Etapa 2 ----------------- */}
            <Card className="w-full shadow-md border rounded-2xl mt-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">Etapa 2</Badge>
                        <CardTitle>Dados do Serviço</CardTitle>
                    </div>
                    {/* sub-título */}
                    <CardDescription className="text-sm text-muted-foreground">
                        Selecione o produto e edite / adicione os materiais necessários.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* seletor de produto com margem maior */}
                    <div className="flex flex-col gap-3 max-w-sm mb-6">
                        <Label className="font-medium">Selecionar produto</Label>
                        <Select onValueChange={handleSelecionarProduto}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="caramanchao">Caramanchão</SelectItem>
                                <SelectItem value="cobertura">Cobertura</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* três tabelas lado a lado em telas ≥ md */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {([
                            ["madeiras", "Madeiras"],
                            ["materiaisGerais", "Materiais Gerais"],
                            ["telhas", "Telhas"],
                        ] as [MaterialCategoria, string][]).map(([categoria, titulo]) => (
                            <Card key={categoria} className="border shadow-sm">
                                <CardHeader className="flex items-center justify-between">
                                    <CardTitle className="text-base">{titulo}</CardTitle>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleAddMaterial(categoria)}
                                        disabled={!!editando}
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                                    </Button>
                                </CardHeader>

                                <CardContent className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            {categoria === "madeiras" ? (
                                                /* ------ Cabeçalho exclusivo p/ Madeiras ------ */
                                                <TableRow className="bg-muted">
                                                    <TableHead>Nome</TableHead>
                                                    <TableHead>Metros</TableHead>          {/* quantidade em metros */}
                                                    <TableHead>Preço&nbsp;/&nbsp;m&nbsp;(R$)</TableHead>
                                                    <TableHead className="text-center">Ações</TableHead>
                                                </TableRow>
                                            ) : (
                                                /* ------ Cabeçalho para Gerais / Telhas ------ */
                                                <TableRow className="bg-muted">
                                                    <TableHead>Nome</TableHead>
                                                    <TableHead>Qtd</TableHead>             {/* quantidade em unidade */}
                                                    <TableHead>Preço&nbsp;(R$)</TableHead>
                                                    <TableHead className="text-center">Ações</TableHead>
                                                </TableRow>
                                            )}
                                        </TableHeader>

                                        {/* ---------- Corpo ---------- */}
                                        <TableBody>
                                            {materiais[categoria].map(({ id, nome, quantidade, preco }) => (
                                                <TableRow key={id}>
                                                    {/* Nome */}
                                                    <TableCell>
                                                        {editando?.id === id && editando.categoria === categoria ? (
                                                            <Input
                                                                value={editData.nome}
                                                                onChange={e => setEditData(d => ({ ...d, nome: e.target.value }))}
                                                            />
                                                        ) : (
                                                            nome
                                                        )}
                                                    </TableCell>

                                                    {/* Quantidade / Metros */}
                                                    <TableCell>
                                                        {editando?.id === id && editando.categoria === categoria ? (
                                                            <Input
                                                                type="number"
                                                                value={editData.quantidade}
                                                                onChange={e =>
                                                                    setEditData(d => ({ ...d, quantidade: +e.target.value }))
                                                                }
                                                            />
                                                        ) : (
                                                            quantidade
                                                        )}
                                                    </TableCell>

                                                    {/* Preço */}
                                                    <TableCell>
                                                        {editando?.id === id && editando.categoria === categoria ? (
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={editData.preco}
                                                                onChange={e => setEditData(d => ({ ...d, preco: +e.target.value }))}
                                                            />
                                                        ) : (
                                                            preco.toFixed(2)
                                                        )}
                                                    </TableCell>

                                                    {/* Ações (sem mudança) */}
                                                    <TableCell className="flex justify-center gap-2">
                                                        {editando?.id === id && editando.categoria === categoria ? (
                                                            <>
                                                                <Button variant="ghost" size="icon" onClick={handleEditSave}>
                                                                    <Save className="w-4 h-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" onClick={() => setEditando(null)}>
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={!!editando}
                                                                    onClick={() =>
                                                                        handleEditStart(categoria, { id, nome, quantidade, preco })
                                                                    }
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={!!editando}
                                                                    onClick={() => handleRemoveMaterial(categoria, id)}
                                                                >
                                                                    <Trash className="w-4 h-4 text-red-500" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>


            {/* ----------------- Etapa 3 ----------------- */}
            <Card className="w-full shadow-md border rounded-2xl mt-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">Etapa 3</Badge>
                        <CardTitle>Resumo do Pedido</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Totais por categoria */}
                        <Card className="border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Totais por Categoria</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Madeiras</TableCell>
                                            <TableCell>R$ {totais.madeiras.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Materiais</TableCell>
                                            <TableCell>R$ {totais.materiais.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Mão de Obra</TableCell>
                                            <TableCell>R$ {totais.maoDeObra.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Empresa PS</TableCell>
                                            <TableCell>R$ {totais.empresaPS.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Empresa GD</TableCell>
                                            <TableCell>R$ {totais.empresaGD.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow className="font-bold">
                                            <TableCell>Total Geral</TableCell>
                                            <TableCell>R$ {somaTotal.toFixed(2)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Tabela fixa de formas de pagamento para telhas */}
                        <Card className="border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Valores fixos – Telhas</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted">
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Pix</TableHead>
                                            <TableHead>10×</TableHead>
                                            <TableHead>18×</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(telhasTabela).map(([tipo, p]) => (
                                            <TableRow key={tipo}>
                                                <TableCell>{tipo}</TableCell>
                                                <TableCell>R$ {p.pix.toFixed(2)}</TableCell>
                                                <TableCell>R$ {p.dez.toFixed(2)}</TableCell>
                                                <TableCell>R$ {p.dezoito.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Botões finais */}
            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => router.push("/")}>
                    Voltar
                </Button>
                <Button
                    variant="default"
                    onClick={() =>
                        console.log("Gerar orçamento:", formValues, produtoSelecionado, materiais)
                    }
                >
                    Gerar Orçamento
                </Button>
            </div>
        </PageLayout>
    )
}
