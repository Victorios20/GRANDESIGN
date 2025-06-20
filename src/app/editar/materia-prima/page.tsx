/* app/home/editar-materiais/page.tsx */
"use client";

import { useState } from "react";
import { PageLayout } from "@/components/ui/pageLayout";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Trash, Plus, Edit, Save, X } from "lucide-react";

/* ---------- tipos ---------- */
type Item = { id: number; nome: string; preco: number };

/* ------------------------------------------------------------------
   🔹 MOCK “vindo do backend”
   Quando o verdadeiro endpoint existir, basta trocar esses arrays
   pelas listas retornadas pela API (ou usar SWR / React Query etc.)
------------------------------------------------------------------- */
const mockMateriais: Item[] = [
    { id: 1, nome: "Cimento 50 kg", preco: 35 },
    { id: 2, nome: "Areia (m³)", preco: 70 },
    { id: 3, nome: "Parafuso 10 mm (100 un)", preco: 12 },
];

const mockMadeiras: Item[] = [
    { id: 1, nome: "Viga 5 m", preco: 58 },
    { id: 2, nome: "Ripa 2 m", preco: 18 },
    { id: 3, nome: "Caibro 3 m", preco: 32 },
];

const mockTelhas: Item[] = [
    { id: 1, nome: "Telha Romana", preco: 7.5 },
    { id: 2, nome: "Telha Colonial", preco: 8.2 },
    { id: 3, nome: "Telha Americana", preco: 7.9 },
];

/* ---------- tabela editável ---------- */
function EditableTable({
    items,
    setItems,
    title,
    onEditingChange,
}: {
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    title: string;
    onEditingChange: (editing: boolean) => void;
}) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<{ nome: string; preco: number }>({
        nome: "",
        preco: 0,
    });

    const isValid = editData.nome.trim() !== "" && editData.preco > 0;

    const startEdit = (it: Item) => {
        setEditingId(it.id);
        setEditData({ nome: it.nome, preco: it.preco });
        onEditingChange(true);
    };

    const cancelEdit = () => {
        if (
            editingId !== null &&
            items.find((i) => i.id === editingId)?.nome.trim() === ""
        ) {
            setItems((old) => old.filter((i) => i.id !== editingId));
        }
        setEditingId(null);
        onEditingChange(false);
    };

    const saveEdit = () => {
        if (editingId === null || !isValid) return;
        setItems((old) =>
            old.map((i) => (i.id === editingId ? { ...i, ...editData } : i))
        );
        setEditingId(null);
        onEditingChange(false);
    };

    const removeItem = (id: number) => {
        setItems((old) => old.filter((i) => i.id !== id));
        if (editingId === id) cancelEdit();
    };

    const addItem = () => {
        const newId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
        setItems((old) => [...old, { id: newId, nome: "", preco: 0 }]);
        setEditingId(newId);
        setEditData({ nome: "", preco: 0 });
        onEditingChange(true);
    };

    return (
        <Card className="w-full max-w-[900px] mx-auto border border-bege shadow-sm rounded-2xl">
            <CardHeader className="flex items-center justify-between bg-bege-header rounded-t-2xl">
                <CardTitle className="text-lg font-semibold text-marromEscuro">
                    {title}
                </CardTitle>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={addItem}
                    disabled={editingId !== null}
                    className="gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar
                </Button>
            </CardHeader>

            <CardContent className="overflow-x-auto rounded-b-2xl">
                <Table className="rounded-xl overflow-hidden">
                    <TableHeader>
                        <TableRow className="bg-bege">
                            <TableHead className="w-1/2 text-marromEscuro">Nome</TableHead>
                            <TableHead className="w-1/4 text-marromEscuro">Preço&nbsp;(R$)</TableHead>
                            <TableHead className="w-1/4 text-center text-marromEscuro">Ações</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {items.map(({ id, nome, preco }) => {
                            const editing = id === editingId;
                            return (
                                <TableRow key={id} className="group hover:bg-madeira-100">
                                    <TableCell>
                                        {editing ? (
                                            <Input
                                                value={editData.nome}
                                                onChange={(e) => setEditData((d) => ({ ...d, nome: e.target.value }))}
                                                autoFocus
                                                className="h-8 text-xs bg-transparent focus-visible:ring-1 focus-visible:ring-primary"
                                            />
                                        ) : (
                                            nome
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        {editing ? (
                                            <Input
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                value={editData.preco}
                                                onChange={(e) =>
                                                    setEditData((d) => ({
                                                        ...d,
                                                        preco: Number(e.target.value) || 0,
                                                    }))
                                                }
                                                className="h-8 text-xs bg-transparent focus-visible:ring-1 focus-visible:ring-primary"
                                            />
                                        ) : (
                                            preco.toFixed(2)
                                        )}
                                    </TableCell>

                                    <TableCell className="flex justify-center gap-2">
                                        {editing ? (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={saveEdit} disabled={!isValid}>
                                                    <Save className="w-5 h-5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={cancelEdit}>
                                                    <X className="w-5 h-5" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => startEdit({ id, nome, preco })}
                                                    disabled={editingId !== null}
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(id)}
                                                    className="text-destructive hover:bg-destructive/10"
                                                    disabled={editingId !== null}
                                                >
                                                    <Trash className="w-5 h-5" />
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/* ---------- página ---------- */
export default function EditarMateriaisPage() {
    const [materiais, setMateriais] = useState<Item[]>(mockMateriais);
    const [madeiras, setMadeiras] = useState<Item[]>(mockMadeiras);
    const [telhas, setTelhas] = useState<Item[]>(mockTelhas);

    const [editing, setEditing] = useState(false);
    const [tab, setTab] = useState<"materiais" | "madeiras" | "telhas">("materiais");

    const links = [
        { label: "Home", href: "/home" },
        { label: "Editar Materiais", href: "/home/editar-materiais" },
    ];

    const triggerBase =
        "px-6 py-2 font-medium rounded-lg transition disabled:pointer-events-none disabled:opacity-50";
    const triggerActive = "bg-white shadow-sm text-black";

    return (
        <PageLayout links={links}>
            <div className="max-w-8xl mx-auto mt-10">
                <h1 className="text-4xl font-bold mb-4 text-marromEscuro">
                    Editar Materiais
                </h1>

                <Tabs
                    value={tab}
                    onValueChange={(v: string) =>
                        setTab(v as "materiais" | "madeiras" | "telhas")
                    }
                >


                    <TabsList className="bg-muted p-1 rounded-xl border w-full max-w-xs">
                        {[
                            ["materiais", "Materiais"],
                            ["madeiras", "Madeiras"],
                            ["telhas", "Telhas"],
                        ].map(([val, label]) => (
                            <TabsTrigger
                                key={val}
                                value={val}
                                disabled={editing}
                                className={`${triggerBase} ${tab === val ? triggerActive : ""}`}
                            >
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="materiais" className="mt-6">
                        <EditableTable
                            items={materiais}
                            setItems={setMateriais}
                            title="Materiais"
                            onEditingChange={setEditing}
                        />
                    </TabsContent>

                    <TabsContent value="madeiras" className="mt-6">
                        <EditableTable
                            items={madeiras}
                            setItems={setMadeiras}
                            title="Madeiras"
                            onEditingChange={setEditing}
                        />
                    </TabsContent>

                    <TabsContent value="telhas" className="mt-6">
                        <EditableTable
                            items={telhas}
                            setItems={setTelhas}
                            title="Telhas"
                            onEditingChange={setEditing}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </PageLayout>
    );
}
