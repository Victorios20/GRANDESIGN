"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { PlusCircle, EllipsisVertical, Eye, Pencil, Trash2, ArrowUpRight, Edit, Copy } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { BigShinyButton } from "@/components/ui/BigShinyButton"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { toast, Toaster } from "sonner"
import FilterCard, { type FieldId, type Option, type FilterState } from "./FilterCard"



import { listarBairros, buscarOrcamentos } from "./_actions/home.actions"
import type { OrcamentoTabela } from "./_actions/home.actions"

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
  const [telefone, setTelefone] = useState("")
  const [cidadeId, setCidadeId] = useState<number | null>(null)
  const [tipoObraId, setTipoObraId] = useState<number | null>(null)

  const [cidadesOpts, setCidadesOpts] = useState<{ id: number; label: string }[]>([])
  const [tiposOpts, setTiposOpts] = useState<{ id: number; label: string }[]>([])
  const availableFields = useMemo(() => ([
    { id: "q", label: "Nome ou Título", type: "text" },
    { id: "telefone", label: "Telefone", type: "text" },
    { id: "bairro", label: "Bairro", type: "text" },
    { id: "cidadeId", label: "Cidade", type: "select", options: cidadesOpts as Option[] },
    { id: "tipoObraId", label: "Tipo de obra", type: "select", options: tiposOpts as Option[] },
    { id: "dateField", label: "Campo de data", type: "segmented" },
    { id: "dateRange", label: "Período", type: "dateRange" },
    { id: "pageSize", label: "Linhas por página", type: "select", options: [5, 10, 20] },
  ] as const), [cidadesOpts, tiposOpts])

  const PERSIST_KEY = "gd.historico.filtros.campos.v1"
const DEFAULT_FIELDS: FieldId[] = ["q","dateRange","pageSize","bairro","telefone","cidadeId","tipoObraId"]

const [selectedFields, setSelectedFields] = useState<FieldId[]>(() => {
  if (typeof window === "undefined") return DEFAULT_FIELDS
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    const saved = raw ? (JSON.parse(raw) as FieldId[]) : null
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_FIELDS
  } catch {
    return DEFAULT_FIELDS
  }
})


  const [listaBairros, setListaBairros] = useState<string[]>(initial.listaBairros ?? [])


  const [orcamentos, setOrcamentos] = useState<OrcamentoTabela[]>(initial.dados ?? [])
  const [total, setTotal] = useState<number>(initial.total ?? 0)
  const [loadingTabela, setLoadingTabela] = useState(false)


  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    if (nome.trim() && page !== 1) setPage(1)
  }, [nome])



  useEffect(() => {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(selectedFields))
  } catch {}
}, [selectedFields])


  useEffect(() => {
    listarBairros().then(setListaBairros).catch(() => { })

      ; (async () => {
        try {
          const [rc, rt] = await Promise.all([
            fetch(`/api/cidades?page=1&pageSize=100`).then(r => r.json()),
            fetch(`/api/tipos-obra?page=1&pageSize=100`).then(r => r.json()),
          ])

          // Normalizador robusto: aceita options | data | items | array cru
          function toOptions(res: any, labelKeys: string[]): { id: number; label: string }[] {
            const arr = res?.options ?? res?.data ?? res?.items ?? res ?? []
            if (!Array.isArray(arr)) return []

            return arr
              .map((x: any) => {
                const id = Number(x?.id)
                if (!Number.isFinite(id)) return null
                // tenta em ordem: chaves conhecidas → fallback genérico
                const label =
                  labelKeys.map(k => (typeof x?.[k] === "string" ? x[k] : null)).find(Boolean) ??
                  (typeof x?.label === "string" ? x.label : null) ??
                  (typeof x?.nome === "string" ? x.nome : null) ??
                  (typeof x?.descricao === "string" ? x.descricao : null) ??
                  (typeof x?.tipo_obra === "string" ? x.tipo_obra : null) ??
                  ""
                const lab = String(label).trim()
                if (!lab) return null
                return { id, label: lab }
              })
              .filter(Boolean) as { id: number; label: string }[]
          }

          setCidadesOpts(toOptions(rc, ["nome", "cidade"]))
          setTiposOpts(toOptions(rt, ["tipo_obra", "nome", "descricao"]))

        } catch { }
      })()

    if ((initial?.dados?.length ?? 0) !== perPage) consultar()
  }, [])


  useEffect(() => {
    consultar()
  }, [nome, bairro, telefone, cidadeId, tipoObraId, dataIni, dataFim, page, perPage, ordenarData])


  async function consultar() {
    setLoadingTabela(true)
    const dIniISO = dataIni?.toISOString().slice(0, 10)
    const dFimISO = dataFim?.toISOString().slice(0, 10)
    // dentro de consultar()
    const pageToSend = nome.trim() ? 1 : page
    const { dados, total } = await buscarOrcamentos(
      nome, bairro, dIniISO, dFimISO, pageToSend, perPage, ordenarData,
      { telefone, cidadeId, tipoObraId }
    )


    setOrcamentos(dados)
    setTotal(total)
    setLoadingTabela(false)
  }

  function limparFiltros() {
    setNome("")
    setBairro("")
    setTelefone("")
    setCidadeId(null)
    setTipoObraId(null)
    setDataIni(undefined)
    setDataFim(undefined)
    setPage(1)
  }





  const safeCell = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : v)
  const strDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy HH:mm")
  const totalPaginas = Math.max(1, Math.ceil(total / perPage))


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
        <FilterCard
          value={{
            q: nome,
            telefone,
            bairro,
            cidadeId,
            tipoObraId,
            ini: dataIni ? dataIni.toISOString().slice(0, 10) : undefined,
            fim: dataFim ? dataFim.toISOString().slice(0, 10) : undefined,
            pageSize: perPage as 5 | 10 | 20,
            dateField: "criacao",
          }}
          onChange={(next: FilterState) => {
            setNome(next.q ?? "")
            setTelefone(next.telefone ?? "")
            setBairro(next.bairro ?? "")
            setCidadeId(next.cidadeId ?? null)
            setTipoObraId(next.tipoObraId ?? null)
            setPerPage((next.pageSize as number) ?? perPage)
            setDataIni(next.ini ? new Date(next.ini) : undefined)
            setDataFim(next.fim ? new Date(next.fim) : undefined)
            setPage(1)
          }}
          onClear={() => limparFiltros()}
          availableFields={availableFields as any}
          selectedFields={selectedFields}
          onSelectedFieldsChange={setSelectedFields}
          loading={loadingTabela}
        />

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
                        <TableHead>Cidade</TableHead>
                        <TableHead>Tipo de obra</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Telefone</TableHead>
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
                          <TableCell>{safeCell((o as any).cidade)}</TableCell>
                          <TableCell>{safeCell((o as any).tipoObra)}</TableCell>
                          <TableCell>{safeCell(strDate(o.dataISO))}</TableCell>
                          <TableCell>{safeCell((o as any).clienteTelefone)}</TableCell>
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

                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={async () => {
                                    const link = `https://app.grandesignce.com.br/gerar-orcamento/edit/${o.id}`
                                    try {
                                      await navigator.clipboard.writeText(link)
                                      toast.success("Link copiado!")
                                    } catch {
                                      toast.error("Não foi possível copiar o link.")
                                    }
                                  }}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copiar link de edição
                                </DropdownMenuItem>

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
      </TooltipProvider>
    </PageLayout>
  )
}
