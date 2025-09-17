"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { PlusCircle, EllipsisVertical, Eye, Pencil, Trash2, ArrowUpRight, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { BigShinyButton } from "@/components/ui/BigShinyButton"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import CopyLinkButton from "@/components/ui/CopyLinkButton"
import { toast, Toaster } from "sonner"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { type DateRange } from "react-day-picker"


import { listarBairros, buscarOrcamentos } from "./_actions/home.actions"
import type { OrcamentoTabela, OrcamentoDetalhe, MaterialItem } from "./_actions/home.actions"

type InitialData = {
  listaBairros: string[]
  dados: OrcamentoTabela[]
  total: number
}

export default function HomeClient({ initial }: { initial: InitialData }) {

  const [nome, setNome] = useState("")
  const [bairro, setBairro] = useState<string>("")
  const [dataIni, setDataIni] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [ordenarData, setOrdenarData] = useState<"asc" | "desc">("desc")
  const [loadingRowId, setLoadingRowId] = useState<number | null>(null)



  const [listaBairros, setListaBairros] = useState<string[]>(initial.listaBairros ?? [])


  const [orcamentos, setOrcamentos] = useState<OrcamentoTabela[]>(initial.dados ?? [])
  const [total, setTotal] = useState<number>(initial.total ?? 0)
  const [loadingTabela, setLoadingTabela] = useState(false)


  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)


  useEffect(() => {
    if (nome.trim() && page !== 1) setPage(1)
  }, [nome])



  const [orcamentoSel, setOrcamentoSel] = useState<OrcamentoDetalhe | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)



  useEffect(() => {
    listarBairros().then(setListaBairros).catch(() => { })
    if ((initial?.dados?.length ?? 0) !== perPage) consultar()

  }, [])

  useEffect(() => {
    consultar()

  }, [nome, bairro, dataIni, dataFim, page, perPage, ordenarData])

  async function consultar() {
    setLoadingTabela(true)
    const dIniISO = dataIni?.toISOString().slice(0, 10)
    const dFimISO = dataFim?.toISOString().slice(0, 10)
    // dentro de consultar()
    const pageToSend = nome.trim() ? 1 : page
    const { dados, total } = await buscarOrcamentos(
      nome, bairro, dIniISO, dFimISO, pageToSend, perPage, ordenarData
    )

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

  function n(x: any) {
    if (typeof x === "number") return Number.isFinite(x) ? x : 0
    const s = String(x ?? "").trim()
    if (!s) return 0
    if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", ".")) || 0
    return Number(s) || 0
  }

  function adaptEditPayloadToModal(src: any) {
    const link_slide = src.link_slide ?? src.links?.slideUrl ?? null
    const link_pdf = src.link_pdf ?? src.links?.pdfUrl ?? null

    const pickStr = (...cands: any[]) => {
      for (const c of cands) {
        if (typeof c === "string" && c.trim()) return c
        if (c && typeof c === "object" && typeof c.nome === "string" && c.nome.trim()) return c.nome
      }
      return null
    }

    const tipoObra =
      src.tipoObra ??
      src.parametros?.tipoObra ??
      src.tipo_obra?.tipo_obra ??
      src.tipo_obra?.nome ??
      (typeof src.tipo_obra === "string" ? src.tipo_obra : null) ??
      src.tipo_obra_nome ??
      null

    const dimensoes = {
      largura: src.largura ?? src.parametros?.largura ?? null,
      comprimento: src.comprimento ?? src.parametros?.comprimento ?? null,
      larguraMenor: src.largura_menor ?? src.parametros?.larguraMenor ?? null,
      larguraMaior: src.largura_maior ?? src.parametros?.larguraMaior ?? null,
      comprimentoMenor: src.comprimento_menor ?? src.parametros?.comprimentoMenor ?? null,
      comprimentoMaior: src.comprimento_maior ?? src.parametros?.comprimentoMaior ?? null,
    }

    const normalizaItem = (i: any) => ({
      nome: i.nome ?? i.descricao ?? "",
      componente: i.componente ?? null,
      quantidade: n(i.quantidade),
      tamanho: i.tamanho != null ? n(i.tamanho) : null,
      precoUnit: n(i.precoUnit ?? i.preco_unitario ?? i.preco),
      frete: n(i.frete ?? 0),
      tipo: i.tipo,
    })

    const itensRaw = Array.isArray(src.itens) ? src.itens.map(normalizaItem) : []
    const madeiras = (src.materiais?.madeiras ?? itensRaw.filter((x: any) => x.tipo === "madeira")).map(normalizaItem)
    const gerais = (src.materiais?.materiaisGerais ?? itensRaw.filter((x: any) => x.tipo === "geral")).map(normalizaItem)
    const telhas = (src.materiais?.telhas ?? itensRaw.filter((x: any) => x.tipo === "telha")).map(normalizaItem)

    const materiaisFlat = [
      ...madeiras.map((m: any) => ({ ...m, tipo: "madeira" })),
      ...gerais.map((g: any) => ({ ...g, tipo: "geral" })),
      ...telhas.map((t: any) => ({ ...t, tipo: "telha" })),
    ]


    const pickArray = (obj: any, ...keys: string[]) => {
      for (const k of keys) if (Array.isArray(obj?.[k])) return obj[k]
      return []
    }
    const pgBrutos = pickArray(
      src,
      "pagamentos",
      "orcamento_pagamentos",
      "orcamento_pagamento",
      "pagamento"
    )


    const pagamentos = pgBrutos.map((p: any) => ({
      tipoTelhas:
        p.tipoTelhas ?? p.tipo_telhas ?? p.tipo_telha ?? p.tipo ?? "",
      metodo: String(
        p.metodo ?? p.metodo_pagamento ?? p.forma ?? p.forma_pagamento ?? ""
      ).toLowerCase(),
      valor: n(p.valor ?? p.preco ?? p.preco_unitario),
    }))


    const telhaValores =
      src.telhaValores ??
      src.telha_valores ??
      src.valoresTelhas ??
      null

    const totais = {
      madeiras: n(src.totais?.madeiras ?? src.totais_madeiras_preco),
      materiais: n(src.totais?.materiais ?? src.totais_materiais_preco),
      comissao: n(src.totais?.comissao ?? src.totais_comissao_preco),
      empresaPS: n(src.totais?.empresaPS ?? src.totais_empresa_ps_preco),
      empresaGD: n(src.totais?.empresaGD ?? src.totais_empresa_gd_preco),
      frete: n(src.totais?.frete ?? src.totais_frete_preco),
    }

    const valorTotalCalc =
      totais.madeiras + totais.materiais + totais.comissao + totais.empresaPS + totais.empresaGD + totais.frete

    const valorTotal = n(src.valor_total) || n(src.valorTotal) || valorTotalCalc
    const dataISO = (src.data_criacao ?? src.dataCriacao ?? src.created_at ?? new Date().toISOString()) as string

    const cliente = {
      nome: pickStr(src.cliente?.nome, src.nome_cliente) ?? "",
      telefone: src.cliente?.telefone ?? null,
      bairro: pickStr(src.cliente?.bairro, src.bairro),
      cidade: pickStr(src.cliente?.cidade, src.cidade),
    }

    return {
      id: src.id,
      titulo: src.titulo ?? null,
      cliente,
      link_slide,
      link_pdf,
      tipoObra,
      dimensoes,
      materiais: materiaisFlat,
      pagamentos,
      telhaValores,
      totais: { ...totais, totalGeral: valorTotal },
      dataISO,
      valorTotal,
    }
  }


  async function abrirModal(o: OrcamentoTabela) {
    if (loadingRowId !== null) return
    setLoadingRowId(o.id)
    setLoadingModal(true)
    try {
      const res = await fetch(`/api/Orcamentos/${o.id}`, { method: "GET" })
      if (!res.ok) throw new Error("Orçamento não encontrado")
      const data = await res.json()
      const det = adaptEditPayloadToModal(data)
      setOrcamentoSel(det)
    } catch (err) {
      toast.error("Não foi possível carregar o orçamento.")
      console.error(err)
    } finally {
      setLoadingModal(false)
      setLoadingRowId(null)
    }
  }


  const materiaisGroup = useMemo(() => {
    const base: Record<"madeira" | "geral" | "telha", MaterialItem[]> = { madeira: [], geral: [], telha: [] }
    if (!orcamentoSel || orcamentoSel.materiais == null) return base
    const m: any = orcamentoSel.materiais
    if (typeof m === "string") {
      try {
        const parsed = JSON.parse(m)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return {
            madeira: parsed.madeiras ?? parsed.madeira ?? [],
            geral: parsed.materiaisGerais ?? parsed.geral ?? [],
            telha: parsed.telhas ?? parsed.telha ?? [],
          }
        }
        if (Array.isArray(parsed)) {
          return parsed.reduce<typeof base>((acc, item) => {
            const k = item?.tipo === "madeira" ? "madeira" : item?.tipo === "telha" ? "telha" : "geral"
            acc[k].push(item)
            return acc
          }, base)
        }
      } catch { }
    }
    if (m && typeof m === "object" && !Array.isArray(m)) {
      return {
        madeira: m.madeiras ?? m.madeira ?? [],
        geral: m.materiaisGerais ?? m.geral ?? [],
        telha: m.telhas ?? m.telha ?? [],
      }
    }
    if (Array.isArray(m)) {
      return m.reduce<typeof base>((acc, item) => {
        const k = item?.tipo === "madeira" ? "madeira" : item?.tipo === "telha" ? "telha" : "geral"
        acc[k].push(item)
        return acc
      }, base)
    }
    return base
  }, [orcamentoSel])

  const fmtBRL = (n: unknown) => {
    const v = typeof n === "number" ? n : Number(n)
    const safe = Number.isFinite(v) ? v : 0
    return safe.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }
  const safeCell = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : v)
  const strDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy HH:mm")
  const totalPaginas = Math.max(1, Math.ceil(total / perPage))

  const handleOrdenarData = () => setOrdenarData(prev => (prev === "asc" ? "desc" : "asc"))


  const slideUrl = orcamentoSel?.link_slide ?? ""
  const pdfUrl = orcamentoSel?.link_pdf ?? ""

  const editUrl =
    orcamentoSel?.id
      ? `${typeof window !== "undefined" ? window.location.origin : "https://app.grandesignce.com.br"}/Orcamento/edit/${orcamentoSel.id}`
      : ""


  const tipoObra = orcamentoSel?.tipoObra ?? null
  const largura = orcamentoSel?.dimensoes?.largura
  const comprimento = orcamentoSel?.dimensoes?.comprimento

  function fmtDim(v: number | null | undefined): string {
    return typeof v === "number" && isFinite(v) && v > 0
      ? `${v.toLocaleString("pt-BR")} m`
      : "-"
  }

  const telhasFixos = useMemo(() => {
    const src: any = orcamentoSel ?? {}


    const tvRaw =
      src.telhaValores ??
      src.telha_valores ??
      src.valoresTelhas ??
      null

    if (tvRaw && typeof tvRaw === "object" && !Array.isArray(tvRaw)) {
      const map: Record<string, { pix?: number; "10×": number | undefined; "18×": number | undefined }> = {}
      for (const [tipo, vals] of Object.entries(tvRaw as Record<string, any>)) {
        const t = String(tipo).trim()
        if (!t) continue
        map[t] = {
          pix: n((vals as any).pix),
          "10×": n((vals as any).x10 ?? (vals as any)["10x"] ?? (vals as any)["10×"]),
          "18×": n((vals as any).x18 ?? (vals as any)["18x"] ?? (vals as any)["18×"]),
        }
      }
      const tipos = Object.keys(map).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
      return { map, tipos }
    }

    // 2) Fallback: montar via pagamentos (aceita várias chaves/formatos)
    const pickArray = (obj: any, ...keys: string[]) => {
      for (const k of keys) if (Array.isArray(obj?.[k])) return obj[k]
      return []
    }
    const pgs = pickArray(src, "pagamentos", "orcamento_pagamento", "orcamento_pagamentos", "pagamento")

    const map: Record<string, { pix?: number; "10×"?: number; "18×"?: number }> = {}
    const tipos: string[] = []

    for (const p of pgs as any[]) {
      const t = String(p.tipoTelhas ?? p.tipo_telhas ?? p.tipo_telha ?? p.tipo ?? "").trim()
      if (!t) continue
      if (!map[t]) { map[t] = {}; tipos.push(t) }

      const metodo = String(p.metodo ?? p.metodo_pagamento ?? p.forma ?? p.forma_pagamento ?? "").toLowerCase()
      const val = n(p.valor ?? p.preco ?? p.preco_unitario)

      if (/(pix|vista|à vista|a vista)/.test(metodo)) map[t].pix = val
      else if (/(10x|10×|(^|[^0-9])10([^0-9]|$))/.test(metodo)) map[t]["10×"] = val
      else if (/(18x|18×|(^|[^0-9])18([^0-9]|$))/.test(metodo)) map[t]["18×"] = val
    }

    tipos.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
    return { map, tipos }
  }, [orcamentoSel])


  /* ────────────────────────── JSX ────────────────────────── */
  return (
    <PageLayout>
      <TooltipProvider>
        <Toaster richColors closeButton />
        {/* BOTÃO “Gerar orçamento” */}


        <Link href="/Orcamento/new" className="block mb-8">
          <BigShinyButton />
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
            <div className="flex flex-wrap lg:flex-nowrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Nome ou Título</label>
                <Input
                  className="h-9 w-[280px]"
                  value={nome}
                  placeholder="Ex: João ou João_Cobertura_Messejana"
                  onChange={e => setNome(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Bairro</label>
                <Select value={bairro} onValueChange={value => setBairro(value)}>
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="Bairro" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {[...new Set(listaBairros)].map(b => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Período</label>
                <DateRangePicker
                  className="w-[240px]"
                  range={{ from: dataIni, to: dataFim }}
                  onChange={(range) => {
                    setDataIni(range?.from)
                    setDataFim(range?.to)
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Linhas / pág</label>
                <Select
                  value={String(perPage)}
                  onValueChange={v => {
                    setPerPage(Number(v))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 w-[96px]">
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

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-marromEscuro">Ordenar por Data</label>
                <Select value={ordenarData} onValueChange={(v) => setOrdenarData(v as "asc" | "desc")}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="Data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Mais Antigo</SelectItem>
                    <SelectItem value="desc">Mais Recente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>

        </Card>



        {/* TABELA */}
        <Card className="mt-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl text-marromEscuro">Orçamentos</CardTitle>
                <CardDescription className="text-marromClaro">
                  Tabela com os orçamentos dos clientes.
                </CardDescription>
              </div>

              <Link href="/Orcamento/new">
                <InteractiveHoverButton className="px-5 py-2 text-sm font-medium rounded-lg shadow-sm hover:shadow-md">
                  Gerar Novo
                </InteractiveHoverButton>
              </Link>
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
                        <TableHead>Título</TableHead>
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
                          className="odd:bg-muted/40 hover:bg-muted/60 transition-colors"
                        >



                          <TableCell>{safeCell(o.titulo)}</TableCell>
                          <TableCell>{safeCell(o.cliente)}</TableCell>
                          <TableCell>{safeCell(o.bairro)}</TableCell>
                          <TableCell>{safeCell(strDate(o.dataISO))}</TableCell>
                          <TableCell>{safeCell(o.valorFormatado)}</TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-marromEscuro hover:bg-marromClaro/20"
                                  aria-label="Ações"
                                >
                                  <EllipsisVertical className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild className="cursor-pointer">
                                  <Link href={`/Orcamento/edit/${o.id}`} title="Editar orçamento">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar orçamento
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild className="cursor-pointer">
                                  <Link href={`/Orcamento/detalhes/${o.id}`} title="Visualizar detalhes">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Visualizar detalhes
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                      <span className="flex items-center text-sm">Página {page} de {totalPaginas}</span>
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
            if (!open) setOrcamentoSel(null) // limpa só ao fechar
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
                {/* título + subtítulo */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-1">
                    <div className="flex items-center justify-between">
                      {/* Esquerda: título + copiar */}
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-3xl">
                          Orçamento&nbsp;de&nbsp;{safeCell(orcamentoSel?.cliente?.nome)} – {safeCell(orcamentoSel?.cliente?.bairro)}
                        </CardTitle>

                        <CopyLinkButton value={editUrl} label="Copiar link de edição" />
                      </div>

                      {/* Direita: botão Editar */}
                      <Button asChild className="bg-bege text-marromEscuro hover:bg-bege/80">
                        <Link href={`/Orcamento/edit/${orcamentoSel.id}`} onClick={() => setOrcamentoSel(null)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Link>
                      </Button>
                    </div>


                    <CardDescription className="mt-1">
                      <span className="font-medium">Título:</span> {safeCell(orcamentoSel?.titulo)}
                    </CardDescription>
                  </CardHeader>
                </Card>



                {/* cliente */}
                <Card>
                  <CardHeader><CardTitle>Dados do Cliente</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><b>Nome:</b> {safeCell(orcamentoSel.cliente.nome)}</p>
                    <p><b>Telefone:</b> {safeCell(orcamentoSel.cliente.telefone)}</p>
                    <p><b>Cidade:</b> {safeCell(orcamentoSel.cliente.cidade)}</p>
                    <p><b>Bairro:</b> {safeCell(orcamentoSel.cliente.bairro)}</p>

                    <p><b>Tipo de Obra:</b> {safeCell(tipoObra)}</p>
                    <p><b>Largura:</b> {fmtDim(largura)}</p>
                    <p><b>Comprimento:</b> {fmtDim(comprimento)}</p>

                  </CardContent>
                </Card>

                {/* materiais */}
                {(["madeira", "geral", "telha"] as const).map((tipo) => {
                  const linhas = materiaisGroup[tipo]
                  if (!linhas.length) return null

                  const titulo =
                    tipo === "madeira" ? "Madeiras" :
                      tipo === "geral" ? "Materiais Gerais" :
                        "Telhas"

                  return (
                    <Card key={tipo}>
                      <CardHeader><CardTitle>{titulo}</CardTitle></CardHeader>
                      <CardContent className="p-4">
                        <div className="rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader className="bg-bege">
                              <TableRow className="bg-bege hover:bg-bege">
                                {tipo === "madeira" ? (
                                  <>
                                    <TableHead>Componente</TableHead>
                                    <TableHead>Madeira</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead className="text-right">Tamanho</TableHead>
                                    <TableHead className="text-right">Preço (m)</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </>
                                ) : tipo === "geral" ? (
                                  <>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead className="text-right">Preço (un)</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </>
                                ) : (
                                  <>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead className="text-right">Preço (un)</TableHead>
                                    <TableHead className="text-right">Frete</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </>
                                )}
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {linhas.map((l: MaterialItem, i: number) => {
                                const qtd = Number(l.quantidade ?? 0)
                                const preco = Number(l.precoUnit ?? 0)
                                const tam = Number(l.tamanho ?? 0)
                                const frete = Number(l.frete ?? 0)

                                const total =
                                  tipo === "madeira" ? tam * qtd * preco :
                                    tipo === "telha" ? qtd * preco + frete :
                                      qtd * preco

                                return (
                                  <TableRow key={i} className="odd:bg-muted/40">
                                    {tipo === "madeira" ? (
                                      <>
                                        <TableCell>{l.componente ?? "-"}</TableCell>
                                        <TableCell>{l.nome}</TableCell>
                                        <TableCell className="text-right">{qtd || "-"}</TableCell>
                                        <TableCell className="text-right">{tam || "-"}</TableCell>
                                        <TableCell className="text-right">{fmtBRL(preco)}</TableCell>
                                        <TableCell className="text-right">{fmtBRL(total)}</TableCell>
                                      </>
                                    ) : tipo === "geral" ? (
                                      <>
                                        <TableCell>{l.nome}</TableCell>
                                        <TableCell className="text-right">{qtd || "-"}</TableCell>
                                        <TableCell className="text-right">{fmtBRL(preco)}</TableCell>
                                        <TableCell className="text-right">{fmtBRL(total)}</TableCell>
                                      </>
                                    ) : (
                                      <>
                                        <TableCell>{l.nome}</TableCell>
                                        <TableCell className="text-right">{qtd || "-"}</TableCell>
                                        <TableCell className="text-right">{fmtBRL(preco)}</TableCell>
                                        <TableCell className="text-right">{fmtBRL(frete)}</TableCell>
                                        <TableCell className="text-right">{fmtBRL(total)}</TableCell>
                                      </>
                                    )}
                                  </TableRow>
                                )
                              })}
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
                      <Table>
                        <TableBody>
                          {[
                            ["Madeiras", orcamentoSel.totais.madeiras],
                            ["Materiais", orcamentoSel.totais.materiais],
                            ["Comissão", orcamentoSel.totais.comissao],
                            ["Empresa PS", orcamentoSel.totais.empresaPS],
                            ["Empresa GD", orcamentoSel.totais.empresaGD],
                            ["Frete", orcamentoSel.totais.frete],
                          ].map(([lab, v]) => (
                            <TableRow key={lab as string}>
                              <TableCell>{lab}</TableCell>
                              <TableCell className="text-right">{fmtBRL(v as number)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold border-t-2">
                            <TableCell>Total Geral</TableCell>
                            <TableCell className="text-right">{fmtBRL(orcamentoSel.totais.totalGeral)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Valores fixos – Telhas (sempre visível) */}

                  <Card className="rounded-2xl shadow-sm">
                    <CardHeader className="p-3 bg-bege/30 border-b border-bege">
                      <CardTitle className="text-sm">Valores fixos – Telhas</CardTitle>
                    </CardHeader>

                    <CardContent className="p-3">
                      <div className="rounded-xl overflow-hidden border border-bege">
                        <Table>
                          <TableHeader className="bg-bege">
                            <TableRow className="bg-bege hover:bg-bege">
                              <TableHead>Tipo</TableHead>
                              <TableHead className="text-right">Pix</TableHead>
                              <TableHead className="text-right">10×</TableHead>
                              <TableHead className="text-right">18×</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {telhasFixos.tipos.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                  Sem valores fixos para este orçamento
                                </TableCell>
                              </TableRow>
                            ) : (
                              telhasFixos.tipos.map((tipo) => {
                                const row = telhasFixos.map[tipo] || {}
                                const pix = row.pix ?? 0
                                const x10 = row["10×"] ?? 0
                                const x18 = row["18×"] ?? 0
                                return (
                                  <TableRow key={tipo}>
                                    <TableCell>{tipo}</TableCell>
                                    <TableCell className="text-right">{fmtBRL(pix)}</TableCell>
                                    <TableCell className="text-right">{fmtBRL(x10)}</TableCell>
                                    <TableCell className="text-right">{fmtBRL(x18)}</TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>


                </div>

                {/* Links da Proposta (estilo Etapa 4, inputs desabilitados) */}
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">Links da Proposta</CardTitle>
                    <CardDescription className="text-sm mt-1 text-black">
                      Abrir e copiar rapidamente os links gerados.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 space-y-5">
                    {/* Slide */}
                    <div className="grid gap-2">
                      <label className="text-sm">Link do Slide</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="bg-bege text-marromEscuro hover:bg-bege/80"
                          disabled={!slideUrl}
                          title={slideUrl ? "Abrir em nova aba" : "Sem link ainda"}
                          onClick={() => slideUrl && window.open(slideUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>

                        <Input
                          value={slideUrl}
                          disabled
                          readOnly
                          className="flex-1"
                          placeholder="Sem link do slide"
                        />

                        {/* botão de copiar reaproveitado */}
                        <CopyLinkButton value={slideUrl} label="Copiar link do Slide" />
                      </div>
                    </div>

                    {/* PDF */}
                    <div className="grid gap-2">
                      <label className="text-sm">Link do PDF</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="bg-bege text-marromEscuro hover:bg-bege/80"
                          disabled={!pdfUrl}
                          title={pdfUrl ? "Abrir em nova aba" : "Sem link ainda"}
                          onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>

                        <Input
                          value={pdfUrl}
                          disabled
                          readOnly
                          className="flex-1"
                          placeholder="Sem link do PDF"
                        />

                        {/* botão de copiar reaproveitado */}
                        <CopyLinkButton value={pdfUrl} label="Copiar link do PDF" />
                      </div>
                    </div>
                  </CardContent>

                </Card>


                <DialogFooter className="pt-6">
                  <DialogClose asChild>
                    <Button variant="outline">Fechar</Button>
                  </DialogClose>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </PageLayout>
  )
}
