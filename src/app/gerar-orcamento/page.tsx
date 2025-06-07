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

type Material = {
    id: number
    nome: string
    quantidade: number
    preco: number
}

export default function GerarOrcamentoPage() {
    const router = useRouter()

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
    const progressoEtapa1 = (camposPreenchidos / totalCampos) * 33

    const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(null)
    const [materiais, setMateriais] = useState<Material[]>([])
    const [editId, setEditId] = useState<number | null>(null)
    const [editData, setEditData] = useState<Omit<Material, "id">>({ nome: "", quantidade: 0, preco: 0 })

    const progresso = Math.round(progressoEtapa1 + (produtoSelecionado ? 33 : 0))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormValues(prev => ({ ...prev, [name]: value }))
    }

    const handleClearForm = () => {
        setFormValues({ nome: "", telefone: "", email: "", cidade: "", bairro: "", endereco: "" })
    }

    const handleSelecionarProduto = (value: string) => {
        setProdutoSelecionado(value)
        const base: Material[] =
            value === "caramanchao"
                ? [
                    { id: 1, nome: "MDF 15mm", quantidade: 2, preco: 50 },
                    { id: 2, nome: "Dobradiça 35mm", quantidade: 4, preco: 3.5 },
                ]
                : value === "cobertura"
                    ? [
                        { id: 1, nome: "Telha PVC", quantidade: 10, preco: 8 },
                        { id: 2, nome: "Barrote", quantidade: 5, preco: 12 },
                    ]
                    : []
        setMateriais(base)
    }

    const addMaterial = () => {
        const newId = materiais.length ? materiais[materiais.length - 1].id + 1 : 1
        const novo: Material = { id: newId, nome: "", quantidade: 1, preco: 0 }
        setMateriais([...materiais, novo])
        setEditId(newId)
        setEditData({ nome: "", quantidade: 1, preco: 0 })
    }

    const saveMaterial = () => {
        if (editId === null) return
        setMateriais((prev) =>
            prev.map((mat) => (mat.id === editId ? { ...mat, ...editData } : mat))
        )
        setEditId(null)
    }

    const removeMaterial = (id: number) => {
        setMateriais((prev) => prev.filter((m) => m.id !== id))
        if (editId === id) setEditId(null)
    }

    const startEdit = (mat: Material) => {
        setEditId(mat.id)
        setEditData({ nome: mat.nome, quantidade: mat.quantidade, preco: mat.preco })
    }

    return (
        <PageLayout links={[{ label: "Home", href: "/" }, { label: "Gerar Orçamento", href: "/gerar-orcamento" }]}>
            <Card className="w-full shadow-md border rounded-2xl mb-6">
                <CardHeader className="flex flex-col gap-2">
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-marromEscuro">
                        Gerar Orçamento
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base text-muted-foreground">
                        Preencha os dados das etapas necessárias da geração do orçamento.
                    </CardDescription>
                    <Progress value={progresso} className="w-full mt-2" />
                </CardHeader>
            </Card>

            {/* Etapa 1 */}
            <Card className="w-full shadow-md border rounded-2xl">
                <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">Etapa 1</Badge>
                                <CardTitle className="text-xl sm:text-2xl font-semibold">
                                    Dados Pessoais
                                </CardTitle>
                            </div>
                            <CardDescription className="text-sm sm:text-base text-muted-foreground">
                                Informe os dados básicos do cliente para iniciarmos o orçamento.
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={handleClearForm}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash className="w-5 h-5 mr-2" />
                            Limpar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {["nome", "telefone", "email", "cidade", "bairro", "endereco"].map((id) => (
                            <div key={id} className="flex flex-col gap-1.5">
                                <Label htmlFor={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</Label>
                                <Input
                                    type="text"
                                    name={id}
                                    id={id}
                                    placeholder={`Digite o ${id}`}
                                    required={id === "nome" || id === "telefone"}
                                    value={formValues[id as keyof typeof formValues]}
                                    onChange={handleChange}
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Etapa 2 */}
            <Card className="w-full shadow-md border rounded-2xl mt-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">Etapa 2</Badge>
                        <div className="flex flex-col">
                            <CardTitle className="text-xl sm:text-2xl font-semibold">Dados do Serviço</CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                                Escolha o produto e faça os ajustes necessários.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="flex flex-col gap-2 max-w-sm">
                        <Label>Selecionar produto</Label>
                        <Select onValueChange={handleSelecionarProduto}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="caramanchao">Caramanchão</SelectItem>
                                <SelectItem value="cobertura">Cobertura</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>


                    <Card className="shadow-md border">
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle className="text-base font-medium">Materiais</CardTitle>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={addMaterial}
                                className="gap-1"
                                disabled={editId !== null}
                            >
                                <Plus className="w-4 h-4" /> Adicionar
                            </Button>
                        </CardHeader>

                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted">
                                        <TableHead className="w-[40%]">Nome</TableHead>
                                        <TableHead className="w-[20%]">Qtd</TableHead>
                                        <TableHead className="w-[20%]">Preço (R$)</TableHead>
                                        <TableHead className="text-center w-[20%]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materiais.map(({ id, nome, quantidade, preco }) => (
                                        <TableRow key={id}>
                                            <TableCell>
                                                {editId === id ? (
                                                    <Input
                                                        value={editData.nome}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({ ...d, nome: e.target.value }))
                                                        }
                                                    />
                                                ) : (
                                                    nome
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editId === id ? (
                                                    <Input
                                                        type="number"
                                                        value={editData.quantidade}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({ ...d, quantidade: +e.target.value }))
                                                        }
                                                    />
                                                ) : (
                                                    quantidade
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editId === id ? (
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={editData.preco}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({ ...d, preco: +e.target.value }))
                                                        }
                                                    />
                                                ) : (
                                                    preco.toFixed(2)
                                                )}
                                            </TableCell>
                                            <TableCell className="flex justify-center gap-2">
                                                {editId === id ? (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={saveMaterial}>
                                                            <Save className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditId(null)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => startEdit({ id, nome, quantidade, preco })}
                                                            disabled={editId !== null}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeMaterial(id)}
                                                            disabled={editId !== null}
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
                </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => router.push("/")}>
                    Voltar
                </Button>
                <Button variant="default" onClick={() => console.log("Gerar orçamento:", formValues, produtoSelecionado, materiais)}>
                    Gerar Orçamento
                </Button>

            </div>
        </PageLayout>
    )
}
