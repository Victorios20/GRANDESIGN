/* ────────────────────────────────────────────────────────────────
   File: app/home/editar-materiais/page.tsx
   Descrição: manutenção da tabela unificada "materiais"
              (abas: Materiais, Madeiras e Telhas)
   Conectada ao Supabase via materiais-service.ts  ➜ CRUD completo
───────────────────────────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
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

import {
  listarMateriaisPorTipo,
  adicionarMaterial,
  atualizarMaterial,
  excluirMaterial,
} from "./actions/materiais-service";

/* ───────── tipos auxiliares ───────── */
type ItemBase = { id: number; nome: string; preco: number };

type ApiHandlers = {
  add: (d: Omit<ItemBase, "id">) => Promise<ItemBase>;
  update: (id: number, d: Partial<Omit<ItemBase, "id">>) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

/* ───────── helpers ───────── */
const moeda = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

/* ──────────────────────────────────────────────
   Componente tabela editável (genérico)
─────────────────────────────────────────────── */
function EditableTable({
  items,
  setItems,
  title,
  api,
  onEditingChange,
}: {
  items: ItemBase[];
  setItems: React.Dispatch<React.SetStateAction<ItemBase[]>>;
  title: string;
  api: ApiHandlers;
  onEditingChange: (editing: boolean) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<ItemBase, "id">>({
    nome: "",
    preco: 0,
  });

  const isValid = form.nome.trim().length > 0 && form.preco > 0;

  /* ───── ações linha ───── */
  const startEdit = (row: ItemBase) => {
    setEditingId(row.id);
    setForm({ nome: row.nome, preco: row.preco });
    onEditingChange(true);
  };

  const cancelEdit = () => {
    if (editingId === 0) {
      setItems((prev) => prev.filter((i) => i.id !== 0));
    }
    setEditingId(null);
    onEditingChange(false);
  };

  const saveEdit = async () => {
    if (!isValid) return;

    if (editingId === 0) {
      const novo = await api.add(form);
      setItems((prev) => prev.map((i) => (i.id === 0 ? novo : i)));
    } else if (editingId) {
      await api.update(editingId, form);
      setItems((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, ...form } : i)),
      );
    }
    setEditingId(null);
    onEditingChange(false);
  };

  const removeItem = async (id: number) => {
    if (id !== 0) await api.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (id === editingId) cancelEdit();
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: 0, nome: "", preco: 0 }]);
    setEditingId(0);
    setForm({ nome: "", preco: 0 });
    onEditingChange(true);
  };

  /* ───── render ───── */
  return (
    <Card className="w-full max-w-[1000px] mx-auto border shadow-sm rounded-2xl">
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
              <TableHead className="w-1/2">Nome</TableHead>
              <TableHead className="w-1/4">Preço (R$)</TableHead>
              <TableHead className="w-1/4 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((row) => {
              const rowEditing = row.id === editingId;

              return (
                <TableRow key={row.id}>
                  {/* nome */}
                  <TableCell>
                    {rowEditing ? (
                      <Input
                        value={form.nome}
                        onChange={(e) =>
                          setForm((d) => ({ ...d, nome: e.target.value }))
                        }
                        autoFocus
                      />
                    ) : (
                      row.nome
                    )}
                  </TableCell>

                  {/* preço */}
                  <TableCell>
                    {rowEditing ? (
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.preco}
                        onChange={(e) =>
                          setForm((d) => ({
                            ...d,
                            preco: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    ) : (
                      moeda(row.preco)
                    )}
                  </TableCell>

                  {/* ações */}
                  <TableCell className="flex justify-center gap-2">
                    {rowEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={saveEdit}
                          disabled={!isValid}
                        >
                          <Save className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(row)}
                          disabled={editingId !== null}
                        >
                          <Edit className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(row.id)}
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

type Aba = "materiais" | "madeiras" | "telhas";

/* ──────────────────────────────────────────────
   Página principal
─────────────────────────────────────────────── */
export default function EditarMateriaisPage() {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Aba>("materiais");

  /* dados */
  const [materiaisGerais, setMateriaisGerais] = useState<ItemBase[]>([]);
  const [madeiras, setMadeiras] = useState<ItemBase[]>([]);
  const [telhas, setTelhas] = useState<ItemBase[]>([]);

  useEffect(() => {
    (async () => {
      const mg = await listarMateriaisPorTipo("geral");
      setMateriaisGerais(
        mg.map((m) => ({
          id: m.id,
          nome: m.descricao,
          preco: Number(m.preco_unitario),
        })),
      );

      const md = await listarMateriaisPorTipo("madeira");
      setMadeiras(
        md.map((m) => ({
          id: m.id,
          nome: m.descricao,
          preco: Number(m.preco_unitario),
        })),
      );

      const tl = await listarMateriaisPorTipo("telha");
      setTelhas(
        tl.map((t) => ({
          id: t.id,
          nome: t.descricao,
          preco: Number(t.preco_unitario),
        })),
      );
    })();
  }, []);

  /* breadcrumb */
  const links = [
    { label: "Home", href: "/" },
    { label: "Editar Materiais", href: "/editar-materiais" },
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as Aba)}>
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
                className={`${triggerBase} ${
                  tab === val ? triggerActive : ""
                }`}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Materiais Gerais */}
          <TabsContent value="materiais" className="mt-6">
            <EditableTable
              title="Materiais"
              items={materiaisGerais}
              setItems={setMateriaisGerais}
              onEditingChange={setEditing}
              api={{
                add: async (d) =>
                  adicionarMaterial("geral", d.nome, d.preco).then((r) => ({
                    id: r.id,
                    nome: r.descricao,
                    preco: Number(r.preco_unitario),
                  })),
                update: (id, d) =>
                  atualizarMaterial(id, {
                    descricao: d.nome,
                    preco_unitario: d.preco,
                  }),
                remove: excluirMaterial,
              }}
            />
          </TabsContent>

          {/* Madeiras */}
          <TabsContent value="madeiras" className="mt-6">
            <EditableTable
              title="Madeiras"
              items={madeiras}
              setItems={setMadeiras}
              onEditingChange={setEditing}
              api={{
                add: async (d) =>
                  adicionarMaterial("madeira", d.nome, d.preco).then((r) => ({
                    id: r.id,
                    nome: r.descricao,
                    preco: Number(r.preco_unitario),
                  })),
                update: (id, d) =>
                  atualizarMaterial(id, {
                    descricao: d.nome,
                    preco_unitario: d.preco,
                  }),
                remove: excluirMaterial,
              }}
            />
          </TabsContent>

          {/* Telhas */}
          <TabsContent value="telhas" className="mt-6">
            <EditableTable
              title="Telhas"
              items={telhas}
              setItems={setTelhas}
              onEditingChange={setEditing}
              api={{
                add: async (d) =>
                  adicionarMaterial("telha", d.nome, d.preco).then((r) => ({
                    id: r.id,
                    nome: r.descricao,
                    preco: Number(r.preco_unitario),
                  })),
                update: (id, d) =>
                  atualizarMaterial(id, {
                    descricao: d.nome,
                    preco_unitario: d.preco,
                  }),
                remove: excluirMaterial,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
