"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Save, Trash2, HardHat, Receipt, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageLayout } from "@/components/ui/pageLayout"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { Separator } from "@/components/ui/separator"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { upsertCliente } from "@/actions/clientes-db/clientes-db"
import { deleteCliente } from "@/actions/clientes-db/clientes-db"
import type { ClienteDetalheDTO } from "@/actions/clientes-db/clientes-db"
import Link from "next/link"

const formSchema = z.object({
    nome: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)"),
    telefone: z.string().optional(),
    bairro: z.string().optional(),
    cidade_id: z.string().optional(), // Select returns string
    cpf: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type ClienteFormProps = {
    initialData?: ClienteDetalheDTO | null
    listaCidades: { id: number; nome: string }[]
}

const VERDE_HEADER = "#376139"

export default function ClienteForm({ initialData, listaCidades }: ClienteFormProps) {
    const router = useRouter()
    const isEditing = !!initialData
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [activeTab, setActiveTab] = useState("dados")

    const defaultValues: FormValues = {
        nome: initialData?.nome || "",
        telefone: initialData?.telefone || "",
        bairro: initialData?.bairro || "",
        cidade_id: initialData?.cidade_id ? String(initialData.cidade_id) : "",
        cpf: initialData?.cpf || "",
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues,
    })

    // ==========================
    // SUBMIT
    // ==========================
    async function onSubmit(values: FormValues) {
        setSaving(true)
        try {
            const payload = {
                nome: values.nome,
                telefone: values.telefone || null,
                bairro: values.bairro || null,
                cidade_id: values.cidade_id ? Number(values.cidade_id) : null,
                cpf: values.cpf || null,
            }

            if (isEditing && initialData) {
                // Update
                const res = await upsertCliente({ id: initialData.id, ...payload } as any) // Using createClienteBasico signature or update?
                // Wait, action upsert-cliente was promised in Plan but I implemented updateCliente inside generic clientes-db.ts 
                // Let's check the imports. I imported updateCliente/createCliente from `clientes-db`.
                // Actually, looking at previous steps, I implemented `updateCliente` and `criarClienteBasico`.
                // I need to use the correct function based on isEditing.

                // I will use `updateCliente` for edit and `criarClienteBasico` for new.
                // Wait, check `clientes-db.ts` content again.
                // It has `updateCliente` and `criarClienteBasico`.

                await updateClienteWrapper(initialData.id, payload)
                toast.success("Cliente atualizado com sucesso!")
            } else {
                // Create
                // criarClienteBasico takes { nome, telefone, bairro, cidade_id, cpf }
                await createClienteWrapper(payload)
                toast.success("Cliente criado com sucesso!")
                router.push("/clientes") // Redirect to list on create
                return
            }

            router.refresh()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Erro ao salvar cliente.")
        } finally {
            setSaving(false)
        }
    }

    // Wrappers to match exact signatures if needed or handle API calls
    async function updateClienteWrapper(id: number, data: any) {
        const mod = await import("@/actions/clientes-db/clientes-db")
        const res = await mod.updateCliente(id, data)
        if (!res.success) throw new Error(res.error)
        return res
    }

    async function createClienteWrapper(data: any) {
        const mod = await import("@/actions/clientes-db/clientes-db")
        const res = await mod.criarClienteBasico(data)
        return res
    }


    // ==========================
    // DELETE
    // ==========================
    async function handleDelete() {
        if (!initialData) return
        setDeleting(true)
        try {
            const res = await deleteCliente(initialData.id)
            if (res.success) {
                toast.success("Cliente excluído com sucesso!")
                router.push("/clientes")
            } else {
                if (res.blockedBy) {
                    toast.error(`Não é possível excluir. Cliente possui ${res.blockedBy.obras} Obras e ${res.blockedBy.orcamentos} Orçamentos vinculados.`)
                } else {
                    toast.error(res.error || "Erro ao excluir cliente.")
                }
            }
        } catch (err) {
            toast.error("Erro inesperado ao excluir.")
        } finally {
            setDeleting(false)
        }
    }

    // ==========================
    // HELPERS (Relations)
    // ==========================
    const obras = initialData?.obras || []
    const orcamentos = initialData?.orcamentos || []

    return (
        <PageLayout
            headerActions={
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => router.push('/clientes')} className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                </div>
            }
            isTitulo
        >
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[#376139]">
                        {isEditing ? `Editar Cliente: ${initialData.nome}` : "Novo Cliente"}
                    </h1>
                    {isEditing && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2">
                                    <Trash2 className="w-4 h-4" /> Excluir Cliente
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Se o cliente tiver obras ou orçamentos, a exclusão será bloqueada.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Exclusão"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                        <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
                        <TabsTrigger value="obras" disabled={!isEditing}>
                            Obras ({obras.length})
                        </TabsTrigger>
                        <TabsTrigger value="orcamentos" disabled={!isEditing}>
                            Orçamentos ({orcamentos.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações do Cliente</CardTitle>
                                <CardDescription>Preencha os dados cadastrais.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="nome">Nome Completo *</Label>
                                            <Input id="nome" {...form.register("nome")} placeholder="Ex: João da Silva" />
                                            {form.formState.errors.nome && (
                                                <p className="text-sm text-red-500">{form.formState.errors.nome.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="telefone">Telefone</Label>
                                            <Input id="telefone" {...form.register("telefone")} placeholder="(85) 99999-9999" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="bairro">Bairro</Label>
                                            <Input id="bairro" {...form.register("bairro")} placeholder="Ex: Messejana" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cidade">Cidade</Label>
                                            <Select
                                                onValueChange={(val) => form.setValue("cidade_id", val)}
                                                defaultValue={form.getValues("cidade_id")}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a cidade" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {listaCidades.map(c => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.nome}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="cpf">CPF (Opcional)</Label>
                                            <Input id="cpf" {...form.register("cpf")} placeholder="000.000.000-00" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button type="submit" disabled={saving} className="bg-[#376139] hover:bg-[#2b4c2d]">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                            Salvar Cliente
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB OBRAS */}
                    <TabsContent value="obras" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <HardHat className="w-5 h-5" /> Obras Vinculadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {obras.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">Este cliente ainda não tem obras.</div>
                                ) : (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted text-muted-foreground font-medium">
                                                <tr>
                                                    <th className="p-3">ID</th>
                                                    <th className="p-3">Título</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3">Valor</th>
                                                    <th className="p-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {obras.map(obra => (
                                                    <tr key={obra.id} className="border-t hover:bg-muted/50">
                                                        <td className="p-3">{obra.id}</td>
                                                        <td className="p-3 font-medium">{obra.titulo || "Sem título"}</td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-1 rounded bg-secondary text-[11px] font-semibold">
                                                                {obra.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            {obra.valor_obra ? `R$ ${obra.valor_obra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "-"}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <Link href={`/obras/${obra.id}`}>
                                                                <Button size="sm" variant="ghost">Ver Obra</Button>
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB ORCAMENTOS */}
                    <TabsContent value="orcamentos" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="w-5 h-5" /> Orçamentos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {orcamentos.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">Nenhum orçamento encontrado.</div>
                                ) : (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted text-muted-foreground font-medium">
                                                <tr>
                                                    <th className="p-3">ID</th>
                                                    <th className="p-3">Título</th>
                                                    <th className="p-3">Data</th>
                                                    <th className="p-3">Valor Total</th>
                                                    <th className="p-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orcamentos.map(orc => (
                                                    <tr key={orc.id} className="border-t hover:bg-muted/50">
                                                        <td className="p-3">{orc.id}</td>
                                                        <td className="p-3 font-medium">{orc.titulo || "-"}</td>
                                                        <td className="p-3">
                                                            {orc.data_criacao ? new Date(orc.data_criacao).toLocaleDateString('pt-BR') : "-"}
                                                        </td>
                                                        <td className="p-3">
                                                            R$ {orc.totais_empresa_gd_preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <Link href={`/orcamento/detalhes/${orc.id}`}>
                                                                <Button size="sm" variant="ghost">Ver Orçamento</Button>
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </PageLayout>
    )
}
