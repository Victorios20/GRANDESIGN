"use client"

import * as React from "react"
import { format, parseISO, isWithinInterval } from "date-fns"
import Link from "next/link"

/* layout */
import { PageLayout } from "@/components/ui/pageLayout"

/* ui */
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Table, TableHeader, TableRow,
  TableHead, TableBody, TableCell,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  Card, CardHeader, CardTitle,
  CardDescription, CardContent,
} from "@/components/ui/card"
import {
  PlusCircle, Trash2, EyeIcon, CalendarIcon,
} from "lucide-react"

/* ---------- tipos + mock ---------- */
type Orcamento = { id: number; cliente: string; bairro: string; data: string; valor: string }
const MOCK_DATA: Orcamento[] = [
  { id: 1, cliente: "João Silva", bairro: "Centro", data: "2025-05-15", valor: "R$ 1.500,00" },
  { id: 2, cliente: "Maria Oliveira", bairro: "Jardim", data: "2025-05-20", valor: "R$ 2.300,00" },
  { id: 3, cliente: "Carlos Santos", bairro: "Vila Nova", data: "2025-05-25", valor: "R$ 1.800,00" },
  { id: 4, cliente: "Ana Pereira", bairro: "Centro", data: "2025-05-28", valor: "R$ 3.200,00" },
  { id: 5, cliente: "Paulo Souza", bairro: "Jardim", data: "2025-05-30", valor: "R$ 2.100,00" },
]

export default function HomePage() {
  const [nome, setNome] = React.useState("")
  const [bairro, setBairro] = React.useState<string | undefined>()
  const [dataIni, setDataIni] = React.useState<Date | undefined>()
  const [dataFim, setDataFim] = React.useState<Date | undefined>()
  const [orcSel, setOrcSel] = React.useState<Orcamento | null>(null)
  const [loading] = React.useState(false)

  const dadosFiltrados = MOCK_DATA.filter(o => {
    const nOk = nome ? o.cliente.toLowerCase().includes(nome.toLowerCase()) : true
    const bOk = bairro ? o.bairro === bairro : true
    if (!dataIni && !dataFim) return nOk && bOk
    const d = parseISO(o.data)
    const dOk = isWithinInterval(d, {
      start: dataIni ?? new Date("1900-01-01"),
      end: dataFim ?? new Date("9999-12-31"),
    })
    return nOk && bOk && dOk
  })

  const limpar = () => {
    setNome("")
    setBairro(undefined)
    setDataIni(undefined)
    setDataFim(undefined)
  }

  return (
    <PageLayout>
      <TooltipProvider>
        <div className="space-y-8">
          {/* BOTÃO PRINCIPAL */}
          <Link href="/gerar-orcamento" className="block">
            <Button
              className="
                w-full h-20 sm:h-24 text-xl sm:text-2xl font-semibold gap-3
                bg-white text-marromEscuro border-3 border-marromClaro
                shadow-md hover:shadow-lg hover:bg-bege
              "
            >
              <PlusCircle className="h-12 w-12 opacity-60" />
              Gerar orçamento
            </Button>
          </Link>

          {/* CARD FILTROS */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">Filtros</CardTitle>
                <CardDescription>
                  Preencha os campos para refinar a lista de orçamentos.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={limpar}
                className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Limpar filtros
              </Button>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Nome */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-marromEscuro">Nome</label>
                  <Input value={nome} placeholder="Nome" onChange={e => setNome(e.target.value)} />
                </div>

                {/* Bairro */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-marromEscuro">Bairro</label>
                  <Select value={bairro} onValueChange={setBairro}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Bairro" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Centro", "Jardim", "Vila Nova"].map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Datas */}
                {[{ d: dataIni, set: setDataIni, label: "Data Inicial" },
                  { d: dataFim, set: setDataFim, label: "Data Final" }].map(({ d, set, label }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-marromEscuro">{label}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal">
                          {d ? format(d, "dd/MM/yyyy") : <span>{label}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0">
                        <Calendar mode="single" selected={d} onSelect={set} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CARD ORÇAMENTOS */}
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-2xl">Orçamentos</CardTitle>
                <CardDescription>Tabela com os orçamentos dos clientes.</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : dadosFiltrados.length === 0 ? (
                <p className="text-center text-marromEscuro/70 py-10">
                  Nenhum orçamento encontrado.
                </p>
              ) : (
                <div className="relative w-full overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader className="font-semibold">
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosFiltrados.map(orc => (
                        <TableRow
                          key={orc.id}
                          onClick={() => setOrcSel(orc)}
                          className="cursor-pointer odd:bg-muted/40 hover:bg-bege/40"
                        >
                          <TableCell>{orc.cliente}</TableCell>
                          <TableCell>{orc.bairro}</TableCell>
                          <TableCell>{format(parseISO(orc.data), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{orc.valor}</TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-marromEscuro hover:bg-marromClaro/20">
                                  <EyeIcon className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MODAL DETALHES COM CARDS */}
        <Dialog open={!!orcSel} onOpenChange={() => setOrcSel(null)}>
          <DialogContent className="w-[96vw] sm:max-w-[94vw] lg:max-w-[80vw] max-h-[80vh] overflow-auto">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-3xl">
                  Orçamento #{orcSel?.id}
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><b>Nome:</b> {orcSel?.cliente}</p>
                  <p><b>Telefone:</b> (11) 98765-4321</p>
                  <p><b>Cidade:</b> São Paulo</p>
                  <p><b>Bairro:</b> {orcSel?.bairro}</p>
                  <p><b>Endereço:</b> Rua das Flores 123</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dados do Serviço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><b>Nome do produto:</b> Móvel Planejado</p>
                  <p><b>Preço dos materiais:</b> R$ 1.255,00</p>
                  <p><b>Frete:</b> R$ 200,00</p>
                  <p><b>Mão de obra:</b> Design Móveis</p>
                  <p><b>Empresa:</b> Design Móveis</p>
                  <p className="font-semibold"><b>Total:</b> R$ 2.505,00</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Matéria-prima</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Madeira</TableCell>
                      <TableCell>MDF</TableCell>
                      <TableCell>2 und.</TableCell>
                      <TableCell>R$ 1.000,00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dobradiças</TableCell>
                      <TableCell>Metal</TableCell>
                      <TableCell>8 und.</TableCell>
                      <TableCell>R$ 255,00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
              <Button asChild>
                <Link href={`/editar-orcamento/${orcSel?.id ?? ""}`} onClick={() => setOrcSel(null)}>
                  Editar
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </PageLayout>
  )
}
