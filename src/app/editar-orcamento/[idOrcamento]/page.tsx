// app/editar-orcamento/[idOrcamento]/page.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Trash, X, Edit, Save } from "lucide-react"

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
type OrcamentoMock = {
    cliente: {
        nome: string
        telefone: string
        cidade: string
        bairro: string
    }
    produto: string | null
    materiais: MateriaisPorCategoria
    dimensoes: { largura: number; comprimento: number }
}

/* ---------- Dados simulados ---------- */
const orcamentosMock: Record<string, OrcamentoMock> = {
    "1": {
        cliente: {
            nome: "João da Silva",
            telefone: "85999999999",
            cidade: "Fortaleza",
            bairro: "Meireles",
        },
        produto: "caramanchao",
        materiais: {
            madeiras: [{ id: 1, nome: "Viga 3m", quantidade: 4, preco: 35 }],
            materiaisGerais: [{ id: 1, nome: "Parafuso 10 mm", quantidade: 100, preco: 0.1 }],
            telhas: [{ id: 1, nome: "Telha Romana", quantidade: 30, preco: 7.5 }],
        },
        dimensoes: { largura: 3, comprimento: 5 },
    },
    "2": {
        cliente: {
            nome: "Maria Oliveira",
            telefone: "85988888888",
            cidade: "Caucaia",
            bairro: "Centro",
        },
        produto: "cobertura",
        materiais: {
            madeiras: [{ id: 1, nome: "Ripa 5 m", quantidade: 6, preco: 22 }],
            materiaisGerais: [{ id: 1, nome: "Cimento 50 kg", quantidade: 3, preco: 30 }],
            telhas: [{ id: 1, nome: "Telha Colonial", quantidade: 40, preco: 8 }],
        },
        dimensoes: { largura: 4, comprimento: 6 },
    },
}


/* ---------- Tabelas de materiais ---------- */
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




const telhasPrecoTabela = {
  Romana: { preco: 7.5 },
  Colonial: { preco: 8 },
  Americana: { preco: 7.8 },
}



/* ---------- Componente ---------- */
/* ---------- Componente ---------- */
// (adicione `useEffect` na sua linha de import)
// import { useState, useEffect } from "react"

export default function EditarOrcamentoPage() {
    const router = useRouter()
    const { idOrcamento } = useParams<{ idOrcamento: string }>()



    console.log("param bruto:", idOrcamento);                     // pode exibir ['2'] ou '2%0A'
    // deve exibir o objeto

    const dadosIniciais =
        orcamentosMock[idOrcamento] ?? {
            cliente: { nome: "", telefone: "", cidade: "", bairro: "" },
            produto: null,
            materiais: { madeiras: [], materiaisGerais: [], telhas: [] },
            dimensoes: { largura: 1, comprimento: 1 },
        }

    /* --- Etapa 1: dados pessoais --- */
    const [formValues, setFormValues] = useState(dadosIniciais.cliente)
    const totalCampos = Object.keys(formValues).length
    const camposPreenchidos = Object.values(formValues).filter((v) => v.trim() !== "")
        .length

    /* --- Etapa 2: materiais --- */
    const [produtoSelecionado, setProdutoSelecionado] =
        useState<string | null>(dadosIniciais.produto)
    const [materiais, setMateriais] = useState<MateriaisPorCategoria>(
        dadosIniciais.materiais,
    )
    const [adicionandoId, setAdicionandoId] = useState<number | null>(null)


    /* dimensões da área */
    const [dimensoes, setDimensoes] = useState(dadosIniciais.dimensoes)

    /* 🔄 repopula quando o id chegar/mudar */
    useEffect(() => {
        if (!idOrcamento) return
        const data = orcamentosMock[idOrcamento]
        if (!data) return
        setFormValues(data.cliente)
        setProdutoSelecionado(data.produto)
        setMateriais(data.materiais)
        setDimensoes(data.dimensoes)
    }, [idOrcamento])

    /* controle de edição de linha */
    const [editando, setEditando] = useState<{
        categoria: MaterialCategoria
        id: number
    } | null>(null)
    const [editData, setEditData] = useState<Omit<Material, "id">>({
        nome: "",
        quantidade: 1,
        preco: 0,
    })

    /* --- Barra de progresso simples (Etapa 1 / Etapa 2) --- */
    const progressoEtapa1 = (camposPreenchidos / totalCampos) * 33
    const progresso = Math.round(progressoEtapa1 + (produtoSelecionado ? 33 : 0))

    /* --- Totais (Etapa 3) --- */
    const totMadeiras = materiais.madeiras.reduce(
        (acc, m) => acc + m.quantidade * m.preco,
        0,
    )
    const totMateriaisGerais = materiais.materiaisGerais.reduce(
        (acc, m) => acc + m.quantidade * m.preco,
        0,
    )
    const totTelhas = materiais.telhas.reduce(
        (acc, m) => acc + m.quantidade * m.preco,
        0,
    )
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
                materiaisGerais: [
                    { id: 1, nome: "Parafuso 10 mm", quantidade: 100, preco: 0.1 },
                ],
                telhas: [{ id: 1, nome: "Telha Romana", quantidade: 30, preco: 7.5 }],
            })
        } else if (value === "cobertura") {
            setMateriais({
                madeiras: [{ id: 1, nome: "Ripa 5 m", quantidade: 6, preco: 22 }],
                materiaisGerais: [
                    { id: 1, nome: "Cimento 50 kg", quantidade: 3, preco: 30 },
                ],
                telhas: [{ id: 1, nome: "Telha Colonial", quantidade: 40, preco: 8 }],
            })
        }
    }

    /* Edição de material */
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
        setAdicionandoId(null)
    }

    /* Adicionar material */
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
                preco = materiaisGeraisTabela[nomeSelecionado as keyof typeof materiaisGeraisTabela].preco
            }
            if (categoria === "telhas") {
                nome = nomeSelecionado
                preco = telhasPrecoTabela[nomeSelecionado as keyof typeof telhasPrecoTabela].preco
            }

        }

        const novo: Material = { id: newId, nome, quantidade: 1, preco }
        setMateriais((prev) => ({
            ...prev,
            [categoria]: [...prev[categoria], novo],
        }))
        setEditando({ categoria, id: newId })
        setEditData(novo)
        setAdicionandoId(newId) // 🟨 controle de adicionando
    }


    /* Nova cópia (apenas simulação) */
    const handleNovaCopia = () => {
        console.log("Criar nova cópia deste orçamento →", idOrcamento)
    }

    /* Salvar edições (apenas simulação) */
    const handleSalvarEdicoes = () => {
        console.log("Salvar edições do orçamento →", {
            id: idOrcamento,
            formValues,
            produtoSelecionado,
            materiais,
            dimensoes,
        })
    }

    /* Gerar orçamento final */
    const handleGerarOrcamento = () => {
        console.log("Gerar orçamento PDF/preview com dados:", {
            formValues,
            produtoSelecionado,
            materiais,
            dimensoes,
            totais,
        })
    }

    /* Remover material */
    const handleRemoveMaterial = (categoria: MaterialCategoria, id: number) => {
        setMateriais((prev) => ({
            ...prev,
            [categoria]: prev[categoria].filter((m) => m.id !== id),
        }))
        if (editando?.id === id && editando?.categoria === categoria) setEditando(null)
    }

    /* ---------- Render ---------- */
    /* ... o restante da renderização permanece inalterado ... */
    return (
        <PageLayout
            links={[
                { label: "Home", href: "/" },
                { label: "Editar Orçamento", href: `/editar-orcamento/${idOrcamento}` },
            ]}
        >
            {/* Cabeçalho principal */}
            <Card className="w-full shadow-md border rounded-2xl mb-4 md:mb-6">
                <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
                        Editar Orçamento {formValues.nome}
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base text-muted-foreground">
                        Revise, altere e salve as informações abaixo.
                    </CardDescription>
                    <Progress value={progresso} className="mt-3 md:mt-4" />
                </CardHeader>
            </Card>

            {/* -------- Etapa 1 -------- */}
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
                        Informações do cliente (editáveis)
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-4 md:p-6 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                        {(["nome", "telefone", "cidade", "bairro"] as const).map((id) => (
                            <div key={id} className="flex flex-col gap-1.5">
                                <Label htmlFor={id} className="text-sm font-medium capitalize">
                                    {id}
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

            {/* -------- Etapa 2 -------- */}
            <Card className="w-full shadow-md border rounded-2xl mt-4 md:mt-6">
                <CardHeader className="p-4 md:p-6 pb-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Etapa 2</Badge>
                        <CardTitle className="text-lg md:text-xl">Dados do Serviço</CardTitle>
                    </div>
                    <CardDescription className="text-xs md:text-sm text-muted-foreground mt-0.5">
                        Produto e lista de materiais (editáveis)
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-4 md:p-6 pt-2">
                    {/* seletor + dimensões */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium">Selecionar produto</Label>
                            <Select
                                value={produtoSelecionado ?? undefined}
                                onValueChange={handleSelecionarProduto}
                            >
                                <SelectTrigger className="h-9 md:h-10 w-[140px]" disabled={!!editando}>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="caramanchao">Caramanchão</SelectItem>
                                    <SelectItem value="cobertura">Cobertura</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-4">
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
                                                <SelectItem value="vazio">Manual</SelectItem>
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
                                                    <TableHead className="text-center text-xs font-medium w-16">
                                                        Ações
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>
                                                {materiais[categoria].map(({ id, nome, quantidade, preco }) => {

                                                    const total = quantidade * preco;
                                                    const emEdicao =
                                                        editando?.id === id && editando.categoria === categoria;
                                                    const isAdicionando = adicionandoId === id;

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


            {/* -------- Etapa 3 -------- */}
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
                        {/* Totais por categoria */}
                        <Card className="border shadow-sm">
                            <CardHeader className="p-3 md:p-4">
                                <CardTitle className="text-sm md:text-base">
                                    Totais por Categoria
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 md:p-4 pt-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="text-xs md:text-sm">
                                                    Madeiras
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm font-medium">
                                                    R$ {totais.madeiras.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="text-xs md:text-sm">
                                                    Materiais
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm font-medium">
                                                    R$ {totais.materiais.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="text-xs md:text-sm">
                                                    Mão de Obra
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm font-medium">
                                                    R$ {totais.maoDeObra.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="text-xs md:text-sm">
                                                    Empresa PS
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm font-medium">
                                                    R$ {totais.empresaPS.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="text-xs md:text-sm">
                                                    Empresa GD
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm font-medium">
                                                    R$ {totais.empresaGD.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow className="font-bold border-t-2">
                                                <TableCell className="text-sm md:text-base">
                                                    Total Geral
                                                </TableCell>
                                                <TableCell className="text-sm md:text-base">
                                                    R$ {somaTotal.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tabela de formas de pagamento */}
                        <Card className="border shadow-sm">
                            <CardHeader className="p-3 md:p-4">
                                <CardTitle className="text-sm md:text-base">
                                    Valores fixos – Telhas
                                </CardTitle>
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
                                                    <TableCell className="text-xs md:text-sm">
                                                        R$ {p.pix.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-xs md:text-sm">
                                                        R$ {p.dez.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-xs md:text-sm">
                                                        R$ {p.dezoito.toFixed(2)}
                                                    </TableCell>
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

            {/* -------- Botões finais -------- */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 md:mt-6">
                {/* à ESQUERDA */}
                <Button
                    variant="secondary"
                    onClick={() => router.push("/")}
                    className="h-9 md:h-10"
                >
                    Voltar
                </Button>

                {/* à DIREITA */}
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleNovaCopia} className="h-9 md:h-10">
                        Nova Cópia
                    </Button>
                    <Button variant="outline" onClick={handleSalvarEdicoes} className="h-9 md:h-10">
                        Salvar Edições
                    </Button>
                    <Button variant="default" onClick={handleGerarOrcamento} className="h-9 md:h-10">
                        Gerar Orçamento
                    </Button>
                </div>
            </div>

        </PageLayout>
    )
}
