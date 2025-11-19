// app/orcamento/detalhes/[id]/DetalheOrcamento.tsx
"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { DetalheVM } from "./page"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import CopyLinkButton from "@/components/ui/CopyLinkButton"
import { Edit, ArrowUpRight } from "lucide-react"
import { PageLayout } from "@/components/ui/pageLayout"
import { ShinyButton } from "@/components/ui/shiny-button"

export default function DetalheOrcamento({ detalhe, detailUrl }: { detalhe: DetalheVM; detailUrl: string }) {
  const router = useRouter()

  const fmtBRL = (n: unknown) => {
    const v = typeof n === "number" ? n : Number(n)
    const safe = Number.isFinite(v) ? v : 0
    return safe.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }
  const safeCell = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : v)
  const fmtDim = (v: number | null | undefined) =>
    typeof v === "number" && isFinite(v) && v > 0 ? `${v.toLocaleString("pt-BR")} m` : "-"
  const fmtDate = (d: any) => {
    if (!d) return "-"
    const s = String(d)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/)
    if (!m) return s
    const [, Y, M, D, hh, mm] = m
    return `${D}/${M}/${Y} ${hh}:${mm}`
  }
  const fmtCPF = (cpf: string | null | undefined) => {
    const only = (cpf ?? "").replace(/\D+/g, "")
    if (only.length !== 11) return "-"
    return `${only.slice(0,3)}.${only.slice(3,6)}.${only.slice(6,9)}-${only.slice(9)}`
  }

  const materiaisGroup = useMemo(() => {
    const base: Record<"madeira" | "geral" | "telha", DetalheVM["materiais"]> = { madeira: [], geral: [], telha: [] }
    for (const item of detalhe.materiais) base[item.tipo].push(item as any)
    return base
  }, [detalhe.materiais])

  const editHref = `/orcamento/edit/${detalhe.id}`
  const slideUrl = detalhe.links.slideUrl ?? ""
  const pdfUrl = detalhe.links.pdfUrl ?? ""

  const isRetangular =
    detalhe?.dimensoes?.largura != null && detalhe?.dimensoes?.comprimento != null

  const createdEmail = (detalhe as any)?.createdBy?.email ?? "-"
  const updatedEmail = (detalhe as any)?.updatedBy?.email ?? "-"
  const dataCriacao = (detalhe as any)?.dataCriacao ?? null
  const dataUltimaAlteracao = (detalhe as any)?.dataUltimaAlteracao ?? null

  // ====== Botão Lançar/Visualizar Obra (Shiny) ======
  const obraLancada = !!detalhe.lancadoObra
  const canVisualizarObra = obraLancada && detalhe.obraId != null

  const BotaoObra = () => {
    if (!obraLancada) {
      return (
        <ShinyButton onClick={() => router.push(`/obras/new/${detalhe.id}`)}>
          Lançar obra
        </ShinyButton>
      )
    }
    if (canVisualizarObra) {
      return (
        <ShinyButton onClick={() => router.push(`/obras/${detalhe.obraId}`)}>
          Visualizar obra
        </ShinyButton>
      )
    }
    return (
      <ShinyButton disabled>
        Visualizar obra
      </ShinyButton>
    )
  }

  return (
    <PageLayout
      headerActions={
        <>
          <BotaoObra />
          <Button asChild className="bg-bege text-marromEscuro hover:bg-bege/80">
            <Link href={editHref}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </>
      }
      links={[
        { label: "Home", href: "/" },
        { label: "Detalhar Orçamento", href: `/orcamento/detalhes/${detalhe.id}` },
      ]}
    >
      <div className="container mx-auto space-y-8">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-1">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-3xl">
                  Orçamento de {safeCell(detalhe.cliente.nome)} – {safeCell(detalhe.cliente.bairro)}
                </CardTitle>
                <CopyLinkButton value={detailUrl} label="Copiar link da página" />
              </div>
            </div>

            <CardDescription className="mt-1">
              <span className="font-medium">Título:</span> {safeCell(detalhe.titulo)}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm grow">
              <p><b>Nome:</b> {safeCell(detalhe.cliente.nome)}</p>
              <p><b>Telefone:</b> {safeCell(detalhe.cliente.telefone)}</p>
              <p><b>Bairro:</b> {safeCell(detalhe.cliente.bairro)}</p>
              <p><b>Cidade:</b> {safeCell(detalhe.cliente.cidade)}</p>
              <p><b>CPF:</b> {fmtCPF((detalhe.cliente as any)?.cpf)}</p>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle>Dados da Obra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm grow">
              <p><b>Tipo de obra:</b> {safeCell(detalhe.tipoObra)}</p>
              {isRetangular ? (
                <>
                  <p><b>Largura:</b> {fmtDim(detalhe.dimensoes.largura)}</p>
                  <p><b>Comprimento:</b> {fmtDim(detalhe.dimensoes.comprimento)}</p>
                </>
              ) : (
                <>
                  <p><b>Largura (maior):</b> {fmtDim(detalhe.dimensoes.larguraMaior ?? (detalhe as any).dimensoes.largura_maior)}</p>
                  <p><b>Largura (menor):</b> {fmtDim(detalhe.dimensoes.larguraMenor ?? (detalhe as any).dimensoes.largura_menor)}</p>
                  <p><b>Comprimento (maior):</b> {fmtDim(detalhe.dimensoes.comprimentoMaior ?? (detalhe as any).dimensoes.comprimento_maior)}</p>
                  <p><b>Comprimento (menor):</b> {fmtDim(detalhe.dimensoes.comprimentoMenor ?? (detalhe as any).dimensoes.comprimento_menor)}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle>Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm grow">
              <p><b>Criado por:</b> {createdEmail}</p>
              <p><b>Criado em:</b> {fmtDate(dataCriacao)}</p>
              <p><b>Última edição por:</b> {updatedEmail}</p>
              <p><b>Última edição em:</b> {fmtDate(dataUltimaAlteracao)}</p>
              <div className="pt-2 border-t border-muted">
                <p><b>Data do lançamento da obra:</b> {fmtDate(detalhe.lancadoObraEm)}</p>
                <p><b>ID da obra:</b> {detalhe.obraId != null ? detalhe.obraId : "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

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
                      {linhas.map((l, i) => {
                        const qtd = Number(l.quantidade ?? 0)
                        const preco = Number(l.precoUnit ?? 0)
                        const tam = Number((l as any).tamanho ?? 0)
                        const frete = Number((l as any).frete ?? 0)
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Totais por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Table>
                <TableBody>
                  {(
                    [
                      ["Madeiras", detalhe.totais.madeiras],
                      ["Materiais Gerais", detalhe.totais.materiais],
                      ["Comissão", detalhe.totais.comissao],
                      ["Frete", detalhe.totais.frete],
                      ["Empresa PS", detalhe.totais.empresaPS],
                      ["Empresa GD", detalhe.totais.empresaGD],
                    ] as const
                  ).map(([lab, v]) => (
                    <TableRow key={lab}>
                      <TableCell>{lab}</TableCell>
                      <TableCell className="text-right">{fmtBRL(v)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold border-t-2">
                    <TableCell>Total Geral</TableCell>
                    <TableCell className="text-right">
                      {fmtBRL(detalhe.totais.totalGeral)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
                    {Object.keys(detalhe.telhaValores).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Sem valores fixos para este orçamento
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(detalhe.telhaValores).map(([tipo, row]) => (
                        <TableRow key={tipo}>
                          <TableCell>{tipo}</TableCell>
                          <TableCell className="text-right">{fmtBRL(row.pix ?? 0)}</TableCell>
                          <TableCell className="text-right">{fmtBRL(row["10×"] ?? 0)}</TableCell>
                          <TableCell className="text-right">{fmtBRL(row["18×"] ?? 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Links da Proposta</CardTitle>
            <CardDescription className="text-sm mt-1 text-black">
              Abrir e copiar rapidamente os links gerados.
            </CardDescription>
          </CardHeader>

        <CardContent className="p-4 space-y-5">
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
                <Input value={slideUrl} disabled readOnly className="flex-1" placeholder="Sem link do slide" />
                <CopyLinkButton value={slideUrl} label="Copiar link do Slide" />
              </div>
            </div>

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
                <Input value={pdfUrl} disabled readOnly className="flex-1" placeholder="Sem link do PDF" />
                <CopyLinkButton value={pdfUrl} label="Copiar link do PDF" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
