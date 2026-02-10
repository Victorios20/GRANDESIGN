// src/app/home/HomeClient.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageLayout } from "@/components/ui/pageLayout"
import {
  FileText,
  Building2,
  Clock,
  ShoppingCart,
  Plus,
  ArrowRight,
  ExternalLink,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type HomeUltimaObraDTO = {
  id: number
  cliente: { nome: string; bairro: string | null; cidade: string | null }
  titulo: string | null
  tipo_obra: string
  equipe: string | null
  status: string
  data_criacao: string | null
}

type HomeUltimoOrcamentoDTO = {
  id: number
  titulo: string | null
  bairro: string | null
  cidade: string | null
  tipo_obra: string | null
  data_criacao: string | null
}

type HomeIndicadoresDTO = {
  orcamentosMes: number
  orcamentosSemana: number
  orcamentosMesAnterior: number
  orcamentosVsMesAnteriorPercent: number | null

  obrasAtivas: number
  obrasIniciadasHoje: number
  comprasPendentes: number

  valorObrasMes: number
  valorObrasMesAnterior: number
  valorObrasVsMesAnteriorPercent: number | null
}

type Props = {
  initial: {
    indicadores: HomeIndicadoresDTO
    ultimasObras: HomeUltimaObraDTO[]
    ultimosOrcamentos: HomeUltimoOrcamentoDTO[]
  }
}

function formatBRL(v: number) {
  const n = Number(v)
  if (!Number.isFinite(n)) return "R$ 0"
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatPct(v: number | null) {
  if (v == null || !Number.isFinite(v)) return null
  const sign = v > 0 ? "+" : ""
  return `${sign}${v.toFixed(0)}%`
}

function getStatusColor(status: string) {
  const s = String(status || "").toLowerCase()

  if (s.includes("exec") || s.includes("andamento")) {
    return "bg-primary/20 text-primary-foreground border-primary/30"
  }
  if (s.includes("aguard")) {
    return "bg-warning/20 text-warning-foreground border-warning/30"
  }
  if (s.includes("final") || s.includes("concl")) {
    return "bg-success/20 text-success border-success/30"
  }
  if (s.includes("pend")) {
    return "bg-secondary/20 text-secondary border-secondary/30"
  }
  return "bg-muted text-muted-foreground"
}

export default function HomeClient({ initial }: Props) {
  const router = useRouter()
  const { indicadores, ultimasObras, ultimosOrcamentos } = initial

  const pctOrc = formatPct(indicadores.orcamentosVsMesAnteriorPercent)
  const pctValor = formatPct(indicadores.valorObrasVsMesAnteriorPercent)

  const orcTrendUp = (indicadores.orcamentosVsMesAnteriorPercent ?? 0) >= 0
  const valorTrendUp = (indicadores.valorObrasVsMesAnteriorPercent ?? 0) >= 0

  const kpis = [
    {
      title: "Orçamentos no mês",
      value: String(indicadores.orcamentosMes ?? 0),
      icon: FileText,
      change: `+${indicadores.orcamentosSemana ?? 0} esta semana`,
      trend: "up" as const,
    },
    {
      title: "Obras ativas",
      value: String(indicadores.obrasAtivas ?? 0),
      icon: Building2,
      change: `${indicadores.obrasIniciadasHoje ?? 0} iniciadas hoje`,
      trend: "up" as const,
    },
    {
      title: "Valor em obras do mês",
      value: formatBRL(indicadores.valorObrasMes ?? 0),
      icon: Clock,
      change:
        pctValor != null
          ? `${pctValor} vs mês anterior`
          : indicadores.valorObrasMesAnterior === 0 && indicadores.valorObrasMes > 0
            ? "sem base no mês anterior"
            : "",
      trend: pctValor == null ? "neutral" : valorTrendUp ? "up" : "down",
    },
    {
      title: "Compras pendentes",
      value: String(indicadores.comprasPendentes ?? 0),
      icon: ShoppingCart,
      change: "",
      trend: "warning" as const,
    },
  ] as const

  const quickActions = [
    {
      label: "Novo orçamento",
      href: "/orcamento/new",
      icon: Plus,
      description: "Criar novo orçamento",
    },
    {
      label: "Lista de orçamentos",
      href: "/orcamento",
      icon: FileText,
      description: "Listar todos os orçamentos",
    },
    {
      label: "Lista de obras",
      href: "/obras",
      icon: Building2,
      description: "Ver todas as obras",
    },
    {
      label: "Menu de compras",
      href: "/pedido_compra",
      icon: ShoppingCart,
      description: "Gerenciar pedidos",
    },
  ] as const

  return (
    <PageLayout
      title="Home"
      pageBackground="bg-bege-pagina"
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/orcamento/new">
            <Button className="bg-marromEscuro hover:bg-marromEscuro/90 text-bege">
              <Plus className="h-4 w-4 mr-2" />
              Gerar Novo
            </Button>
          </Link>
        </div>
      }
      isTitulo={true}
    >
      <div className="space-y-8">
        {/* KPI Cards */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => {
              const TrendIcon =
                kpi.trend === "down" ? TrendingDown : kpi.trend === "up" ? TrendingUp : null

              return (
                <Card
                  key={kpi.title}
                  className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <kpi.icon className="w-5 h-5 text-primary-foreground" style={{ color: "#2c201b" }} />
                      </div>
                      {kpi.trend === "warning" ? (
                        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      ) : TrendIcon ? (
                        <TrendIcon className="w-4 h-4 text-muted-foreground" />
                      ) : null}
                    </div>

                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="text-2xl font-bold text-foreground">{kpi.value}</p>

                      {kpi.title === "Orçamentos no mês" && pctOrc != null && (
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          {orcTrendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {pctOrc}
                        </p>
                      )}
                    </div>

                    <p className="text-sm font-medium text-muted-foreground mb-1">{kpi.title}</p>
                    <p className="text-xs text-muted-foreground/70">{kpi.change}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Card className="bg-card border-border shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group hover:-translate-y-1">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <action.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                      <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">{action.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimas Obras */}
          <section>
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-semibold">Últimas Obras</CardTitle>
                <Link href="/obras">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Ver todas
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Título</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Cliente</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Bairro</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Cidade</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tipo</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Equipe</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {ultimasObras.map((obra) => (
                        <tr
                          key={obra.id}
                          onClick={() => router.push(`/obras/${obra.id}`)}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-foreground max-w-[200px] truncate" title={obra.titulo ?? ""}>
                            {obra.titulo ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            <Link href={`/obras/${obra.id}`} className="hover:underline">
                              {obra.cliente.nome}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{obra.cliente.bairro ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{obra.cliente.cidade ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{obra.tipo_obra}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{obra.equipe ?? "-"}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(obra.status)}`}>
                              {obra.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}

                      {ultimasObras.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={7}>
                            Nenhuma obra encontrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Últimos Orçamentos */}
          <section>
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-semibold">Últimos Orçamentos</CardTitle>
                <Link href="/orcamento">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Ver todos
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Título</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Bairro</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Cidade</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tipo de Obra</th>
                      </tr>
                    </thead>

                    <tbody>
                      {ultimosOrcamentos.map((orc) => (
                        <tr
                          key={orc.id}
                          onClick={() => router.push(`/orcamento/detalhes/${orc.id}`)}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            <Link href={`/orcamento/detalhes/${orc.id}`} className="hover:underline">
                              {orc.titulo ?? `Orçamento #${orc.id}`}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{orc.bairro ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{orc.cidade ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{orc.tipo_obra ?? "-"}</td>
                        </tr>
                      ))}

                      {ultimosOrcamentos.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={4}>
                            Nenhum orçamento encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </PageLayout>
  )
}
