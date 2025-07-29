"use client"

import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import Link from "next/link"

/* layout */
import { PageLayout } from "@/components/ui/pageLayout"

/* ui */
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { PlusCircle, Trash2, EyeIcon, CalendarIcon } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"

/* actions (supabase) */
import {
  listarBairros,
  buscarOrcamentos,
  detalheOrcamento,
  OrcamentoTabela,
  OrcamentoDetalhe,
} from "@/actions/historico-orcamento-db/historico-orcamento-db"
/* ────────────────────────────────────────────── */

export default function HomePage() {
  /* filtros */
  const [nome, setNome] = useState("")
  const [bairro, setBairro] = useState<string>("")
  const [dataIni, setDataIni] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()

  /* dropdown */
  const [listaBairros, setListaBairros] = useState<string[]>([])

  /* tabela */
  const [orcamentos, setOrcamentos] = useState<OrcamentoTabela[]>([])
  const [loadingTabela, setLoadingTabela] = useState(true)
  const [total, setTotal] = useState(0)

  /* paginação */
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10) // 5 | 10 | 20

  /* modal */
  const [orcamentoSel, setOrcamentoSel] = useState<OrcamentoDetalhe | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)

  /* ─── carregamento inicial ─── */
  useEffect(() => {
    listarBairros().then(setListaBairros)
  }, [])

  /* ─── refetch quando filtros ou paginação mudam ─── */
  useEffect(() => {
    consultar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, bairro, dataIni, dataFim, page, perPage])

  async function consultar() {
    setLoadingTabela(true)
    const dIniISO = dataIni?.toISOString().slice(0, 10)
    const dFimISO = dataFim?.toISOString().slice(0, 10)
    const { dados, total } = await buscarOrcamentos(nome, bairro, dIniISO, dFimISO, page, perPage)
    setOrcamentos(dados)
    setTotal(total)
    setLoadingTabela(false)
  }

  function limparFiltros() {
    setNome("")
    setBairro("")
    setDataIni(undefined)
    setDataFim(undefined)
    setPage(1)
  }

  async function abrirModal(o: OrcamentoTabela) {
    setLoadingModal(true)
    const det = await detalheOrcamento(o.id)
    setOrcamentoSel(det)
    setLoadingModal(false)
  }

  /* agrupar materiais por tipo */
  const materiaisGroup = useMemo(() => {
    if (!orcamentoSel) return {}
    return orcamentoSel.materiais.reduce<Record<string, typeof orcamentoSel.materiais>>((acc, m) => {
      ; (acc[m.tipo] ??= []).push(m)
      return acc
    }, {})
  }, [orcamentoSel])

  const fmt = (n: number) => `R$ ${n.toFixed(2)}`
  const strDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy")

  const totalPaginas = Math.max(1, Math.ceil(total / perPage))

  /* ────────────────────────── JSX ────────────────────────── */
  return (
    <PageLayout>
      <TooltipProvider>
        {/* BOTÃO “Gerar orçamento” */}
        <Link href="/gerar-orcamento" className="block mb-8">
          <Button
            className="w-full h-20 sm:h-24 text-xl sm:text-2xl font-semibold gap-3
                             bg-white text-marromEscuro border-3 border-marromClaro
                             shadow-md hover:shadow-lg hover:bg-bege"
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
              <CardDescription>Preencha os campos para refinar a lista de orçamentos.</CardDescription>
            </div>
            <Button
              variant="secondary"
              onClick={limparFiltros}
              className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Limpar filtros
            </Button>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Nome</label>
                <Input value={nome} placeholder="Nome" onChange={e => setNome(e.target.value)} />
              </div>

              {/* Bairro */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Bairro</label>
                <Select value={bairro} onValueChange={value => setBairro(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Bairro" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set(listaBairros)].map(b => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Inicial / Data Final */}
              {[
                { d: dataIni, set: setDataIni, label: "Data Inicial" },
                { d: dataFim, set: setDataFim, label: "Data Final" },
              ].map(({ d, set, label }) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-marromEscuro">{label}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="secondary" className="justify-start text-left font-normal">
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

              {/* Linhas por página */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Linhas / pág</label>
                <Select
                  value={String(perPage)}
                  onValueChange={v => {
                    setPerPage(Number(v))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-full max-w-[96px]">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABELA */}
        <Card className="mt-8">
          <CardHeader>
            <div className="space-y-1">
              <CardTitle className="text-2xl">Orçamentos</CardTitle>
              <CardDescription>Tabela com os orçamentos dos clientes.</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {loadingTabela ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : orcamentos.length === 0 ? (
              <p className="text-center text-marromEscuro/70 py-10">Nenhum orçamento encontrado.</p>
            ) : (
              <>
                <div className="rounded-lg overflow-hidden">
                  <Table className="min-w-[640px]">
                    <TableHeader className="bg-bege font-semibold">
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orcamentos.map(o => (
                        <TableRow
                          key={o.id}
                          onClick={() => abrirModal(o)}
                          className="cursor-pointer odd:bg-muted/40 hover:bg-bege/40"
                        >
                          <TableCell>{o.cliente}</TableCell>
                          <TableCell>{o.bairro}</TableCell>
                          <TableCell>{strDate(o.dataISO)}</TableCell>
                          <TableCell>{o.valorFormatado}</TableCell>
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

                {/* Paginação */}
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent className="gap-2">
                      <PaginationItem>
                        <PaginationPrevious
                          aria-label="Anterior"
                          onClick={() => page > 1 && setPage(p => p - 1)}
                          className={page === 1 ? "opacity-50 pointer-events-none" : ""}
                        />
                      </PaginationItem>
                      <span className="flex items-center text-sm">
                        Página {page} de {totalPaginas}
                      </span>
                      <PaginationItem>
                        <PaginationNext
                          aria-label="Próxima"
                          onClick={() => page < totalPaginas && setPage(p => p + 1)}
                          className={page === totalPaginas ? "opacity-50 pointer-events-none" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ……………………………………… MODAL DETALHE ……………………………………… */}
        <Dialog
          open={!!orcamentoSel}
          onOpenChange={(open) => {
            if (!open) setOrcamentoSel(null);   // limpa só ao fechar
          }}
        >

          <DialogContent className="w-[96vw] sm:max-w-[94vw] lg:max-w-[80vw] max-h-[80vh] overflow-auto">
            {loadingModal || !orcamentoSel ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* título */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-3xl">
                      Orçamento&nbsp;de&nbsp;{orcamentoSel.cliente.nome} – {orcamentoSel.cliente.bairro}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {/* cliente */}
                <Card>
                  <CardHeader><CardTitle>Dados do Cliente</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><b>Nome:</b> {orcamentoSel.cliente.nome}</p>
                    <p><b>Telefone:</b> {orcamentoSel.cliente.telefone ?? "—"}</p>
                    <p><b>Cidade:</b> {orcamentoSel.cliente.cidade ?? "—"}</p>
                    <p><b>Bairro:</b> {orcamentoSel.cliente.bairro ?? "—"}</p>
                  </CardContent>
                </Card>

                {/* materiais */}
                {["madeira", "geral", "telha"].map(tipo => {
                  const linhas = materiaisGroup[tipo] ?? []
                  if (!linhas.length) return null
                  const titulo = tipo === "madeira" ? "Madeiras" : tipo === "geral" ? "Materiais Gerais" : "Telhas"
                  return (
                    <Card key={tipo}>
                      <CardHeader><CardTitle>{titulo}</CardTitle></CardHeader>
                      <CardContent className="p-4">
                        <div className="rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader className="bg-bege">
                              <TableRow className="bg-bege hover:bg-bege">
                                <TableHead>Nome</TableHead>
                                <TableHead>Qtd</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {linhas.map((l, i) => (
                                <TableRow key={i} className="odd:bg-muted/40">
                                  <TableCell>{l.nome}</TableCell>
                                  <TableCell>{l.quantidade}</TableCell>
                                  <TableCell>{fmt(l.precoUnit)}</TableCell>
                                  <TableCell>{fmt(l.precoUnit * l.quantidade)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* totais */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle>Totais por Categoria</CardTitle></CardHeader>
                    <CardContent className="p-4">
                      <Table><TableBody>
                        {[
                          ["Madeiras", orcamentoSel.totais.madeiras],
                          ["Materiais", orcamentoSel.totais.materiais],
                          ["Mão de Obra", orcamentoSel.totais.empresaPS],
                          ["Empresa PS", orcamentoSel.totais.empresaPS],
                          ["Empresa GD", orcamentoSel.totais.empresaGD],
                        ].map(([lab, v]) => (
                          <TableRow key={lab as string}>
                            <TableCell>{lab}</TableCell>
                            <TableCell>{fmt(v as number)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold border-t-2">
                          <TableCell>Total Geral</TableCell>
                          <TableCell>{fmt(orcamentoSel.totais.totalGeral)}</TableCell>
                        </TableRow>
                      </TableBody></Table>
                    </CardContent>
                  </Card>

                  {/* valores fixos (mock) */}
                  <Card>
                    <CardHeader><CardTitle>Valores fixos – Telhas</CardTitle></CardHeader>
                    <CardContent className="p-4">
                      <div className="rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-bege">
                            <TableRow className="bg-bege hover:bg-bege">
                              <TableHead>Tipo</TableHead>
                              <TableHead>Pix</TableHead>
                              <TableHead>10×</TableHead>
                              <TableHead>18×</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              ["Romana", 9200, 1015, 591],
                              ["Colonial", 8400, 927, 539],
                              ["Americana", 9100, 1004, 584],
                            ].map(([t, pix, d10, d18]) => (
                              <TableRow key={t as string}>
                                <TableCell>{t}</TableCell>
                                <TableCell>{fmt(pix as number)}</TableCell>
                                <TableCell>{fmt(d10 as number)}</TableCell>
                                <TableCell>{fmt(d18 as number)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <DialogFooter className="pt-6">
                  <DialogClose asChild>
                    <Button variant="outline">Fechar</Button>
                  </DialogClose>
                  <Button asChild>
                    <Link href={`/editar-orcamento/${orcamentoSel.id}`}
                      onClick={() => setOrcamentoSel(null)}>
                      Editar
                    </Link>
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </PageLayout>
  )
}
