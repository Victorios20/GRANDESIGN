// /* ────────────────────────────────────────────────────────────────
//    File: app/home/editar-materiais/page.tsx
// ───────────────────────────────────────────────────────────────── */
// "use client";

// import { useEffect, useState } from "react";
// import { PageLayout } from "@/components/ui/pageLayout";
// import {
//   Tabs,
//   TabsList,
//   TabsTrigger,
//   TabsContent,
// } from "@/components/ui/tabs";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardContent,
// } from "@/components/ui/card";
// import { Edit, Save, X } from "lucide-react";
// import {
//   listarMateriaisPorTipo,
//   atualizarMaterial,
// } from "@/actions/materiais-db/materiais-db";

// type ItemBase = { id: number; nome: string; preco: number };

// const moeda = (n: number) =>
//   `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// function EditableTable({
//   items,
//   setItems,
//   title,
//   onEditingChange,
//   onUpdate,
// }: {
//   items: ItemBase[];
//   setItems: React.Dispatch<React.SetStateAction<ItemBase[]>>;
//   title: string;
//   onEditingChange: (editing: boolean) => void;
//   onUpdate: (id: number, preco: number) => Promise<void>;
// }) {
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [precoInput, setPrecoInput] = useState(0);

//   const startEdit = (row: ItemBase) => {
//     setEditingId(row.id);
//     setPrecoInput(row.preco);
//     onEditingChange(true);
//   };

//   const cancelEdit = () => {
//     setEditingId(null);
//     onEditingChange(false);
//   };

//   const saveEdit = async () => {
//     if (editingId && precoInput > 0) {
//       await onUpdate(editingId, precoInput);
//       setItems((prev) =>
//         prev.map((i) =>
//           i.id === editingId ? { ...i, preco: precoInput } : i
//         )
//       );
//       cancelEdit();
//     }
//   };

//   return (
//     <Card className="w-full max-w-[1000px] mx-auto border shadow-sm rounded-2xl">
//       <CardHeader className="flex items-center justify-between bg-bege-header rounded-t-2xl">
//         <CardTitle className="text-lg font-semibold text-marromEscuro">
//           {title}
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="overflow-x-auto rounded-b-2xl">
//         <Table className="rounded-xl overflow-hidden">
//           <TableHeader>
//             <TableRow className="bg-bege">
//               <TableHead className="w-1/2">Nome</TableHead>
//               <TableHead className="w-1/4">Preço (R$)</TableHead>
//               <TableHead className="w-1/4 text-center">Ações</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {items.map((row) => {
//               const rowEditing = row.id === editingId;
//               return (
//                 <TableRow key={row.id}>
//                   <TableCell>{row.nome}</TableCell>
//                   <TableCell>
//                     {rowEditing ? (
//                       <Input
//                         type="number"
//                         min={0}
//                         step={0.01}
//                         value={precoInput}
//                         onChange={(e) =>
//                           setPrecoInput(Number(e.target.value) || 0)
//                         }
//                         autoFocus
//                       />
//                     ) : (
//                       moeda(row.preco)
//                     )}
//                   </TableCell>
//                   <TableCell className="flex justify-center gap-2">
//                     {rowEditing ? (
//                       <>
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={saveEdit}
//                           disabled={precoInput <= 0}
//                         >
//                           <Save className="w-5 h-5" />
//                         </Button>
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={cancelEdit}
//                         >
//                           <X className="w-5 h-5" />
//                         </Button>
//                       </>
//                     ) : (
//                       <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={() => startEdit(row)}
//                         disabled={editingId !== null}
//                       >
//                         <Edit className="w-5 h-5" />
//                       </Button>
//                     )}
//                   </TableCell>
//                 </TableRow>
//               );
//             })}
//           </TableBody>
//         </Table>
//       </CardContent>
//     </Card>
//   );
// }

// type Aba = "materiais" | "madeiras" | "telhas";

// export default function EditarMateriaisPage() {
//   const [editing, setEditing] = useState(false);
//   const [tab, setTab] = useState<Aba>("materiais");
//   const [materiaisGerais, setMateriaisGerais] = useState<ItemBase[]>([]);
//   const [madeiras, setMadeiras] = useState<ItemBase[]>([]);
//   const [telhas, setTelhas] = useState<ItemBase[]>([]);

//   useEffect(() => {
//     (async () => {
//       const mg = await listarMateriaisPorTipo("geral");
//       setMateriaisGerais(
//         mg.map((m) => ({
//           id: m.id,
//           nome: m.descricao,
//           preco: Number(m.preco_unitario),
//         }))
//       );
//       const md = await listarMateriaisPorTipo("madeira");
//       setMadeiras(
//         md.map((m) => ({
//           id: m.id,
//           nome: m.descricao,
//           preco: Number(m.preco_unitario),
//         }))
//       );
//       const tl = await listarMateriaisPorTipo("telha");
//       setTelhas(
//         tl.map((t) => ({
//           id: t.id,
//           nome: t.descricao,
//           preco: Number(t.preco_unitario),
//         }))
//       );
//     })();
//   }, []);

//   const links = [
//     { label: "Home", href: "/" },
//     { label: "Editar Materiais", href: "/editar-materiais" },
//   ];

//   const triggerBase =
//     "px-6 py-2 font-medium rounded-lg transition disabled:pointer-events-none disabled:opacity-50";
//   const triggerActive = "bg-white shadow-sm text-black";

//   return (
//     <PageLayout links={links}>
//       <div className="max-w-8xl mx-auto mt-10">
//         <h1 className="text-4xl font-bold mb-4 text-marromEscuro">
//           Editar Materiais
//         </h1>
//         <Tabs value={tab} onValueChange={(v) => setTab(v as Aba)}>
//           <TabsList className="bg-muted p-1 rounded-xl border w-full max-w-xs">
//             {[
//               ["materiais", "Materiais"],
//               ["madeiras", "Madeiras"],
//               ["telhas", "Telhas"],
//             ].map(([val, label]) => (
//               <TabsTrigger
//                 key={val}
//                 value={val}
//                 disabled={editing}
//                 className={`${triggerBase} ${
//                   tab === val ? triggerActive : ""
//                 }`}
//               >
//                 {label}
//               </TabsTrigger>
//             ))}
//           </TabsList>
//           <TabsContent value="materiais" className="mt-6">
//             <EditableTable
//               title="Materiais"
//               items={materiaisGerais}
//               setItems={setMateriaisGerais}
//               onEditingChange={setEditing}
//               onUpdate={(id, preco) =>
//                 atualizarMaterial(id, { preco_unitario: preco })
//               }
//             />
//           </TabsContent>
//           <TabsContent value="madeiras" className="mt-6">
//             <EditableTable
//               title="Madeiras"
//               items={madeiras}
//               setItems={setMadeiras}
//               onEditingChange={setEditing}
//               onUpdate={(id, preco) =>
//                 atualizarMaterial(id, { preco_unitario: preco })
//               }
//             />
//           </TabsContent>
//           <TabsContent value="telhas" className="mt-6">
//             <EditableTable
//               title="Telhas"
//               items={telhas}
//               setItems={setTelhas}
//               onEditingChange={setEditing}
//               onUpdate={(id, preco) =>
//                 atualizarMaterial(id, { preco_unitario: preco })
//               }
//             />
//           </TabsContent>
//         </Tabs>
//       </div>
//     </PageLayout>
//   );
// }
