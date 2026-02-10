import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type Decimalish = number | string | Prisma.Decimal

const n = (v: any) =>
  v == null ? 0 : typeof v?.toNumber === "function" ? v.toNumber() : Number(v)

const pct = (cur: number, prev: number) => {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null
  if (prev === 0) {
    if (cur === 0) return 0
    return null
  }
  return ((cur - prev) / prev) * 100
}

export type HomeUltimaObraDTO = {
  id: number
  cliente: { nome: string; bairro: string | null; cidade: string | null }
  titulo: string | null
  tipo_obra: string
  equipe: string | null
  status: string
  data_criacao: string | null
}

export type HomeUltimoOrcamentoDTO = {
  id: number
  titulo: string | null
  bairro: string | null
  cidade: string | null
  tipo_obra: string | null
  data_criacao: string | null
}

export type HomeIndicadoresDTO = {
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

export type HomeIndicadoresResult = {
  indicadores: HomeIndicadoresDTO
  ultimasObras: HomeUltimaObraDTO[]
  ultimosOrcamentos: HomeUltimoOrcamentoDTO[]
}

export async function getHomeIndicadoresDB(): Promise<HomeIndicadoresResult> {
  const [orcMes, orcSem, orcMesAnt, obrasAtivas, obrasHoje, comprasPendentes, valorMes, valorMesAnt] =
    await Promise.all([
      prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS n
        FROM orcamento
        WHERE excluido = false
          AND data_criacao IS NOT NULL
          AND data_criacao >= date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))
          AND data_criacao <  (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')) + interval '1 month')
      `),
      prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS n
        FROM orcamento
        WHERE excluido = false
          AND data_criacao IS NOT NULL
          AND data_criacao >= date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo'))
          AND data_criacao <  (date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo')) + interval '1 week')
      `),
      prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS n
        FROM orcamento
        WHERE excluido = false
          AND data_criacao IS NOT NULL
          AND data_criacao >= (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')) - interval '1 month')
          AND data_criacao <  (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')))
      `),
      prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS n
        FROM obras
        WHERE status <> 'Finalizado'
      `),
      prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS n
        FROM obras
        WHERE data_criacao IS NOT NULL
          AND data_criacao >= date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo'))
          AND data_criacao <  (date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo')) + interval '1 day')
      `),
      prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS n
        FROM pedido_compra
        WHERE status = 'Pendente'
      `),
      prisma.$queryRaw<{ total: Decimalish | null }[]>(Prisma.sql`
        SELECT COALESCE(
          SUM(COALESCE(pagamento_entrada, 0) + COALESCE(pagamento_quitacao, 0)),
          0
        ) AS total
        FROM obras
        WHERE data_criacao IS NOT NULL
          AND data_criacao >= date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))
          AND data_criacao <  (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')) + interval '1 month')
      `),
      prisma.$queryRaw<{ total: Decimalish | null }[]>(Prisma.sql`
        SELECT COALESCE(
          SUM(COALESCE(pagamento_entrada, 0) + COALESCE(pagamento_quitacao, 0)),
          0
        ) AS total
        FROM obras
        WHERE data_criacao IS NOT NULL
          AND data_criacao >= (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')) - interval '1 month')
          AND data_criacao <  (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')))
      `),
    ])

  const orcamentosMes = Number((orcMes?.[0]?.n ?? 0) as any) || 0
  const orcamentosSemana = Number((orcSem?.[0]?.n ?? 0) as any) || 0
  const orcamentosMesAnterior = Number((orcMesAnt?.[0]?.n ?? 0) as any) || 0
  const orcamentosVsMesAnteriorPercent = pct(orcamentosMes, orcamentosMesAnterior)

  const obrasAtivasN = Number((obrasAtivas?.[0]?.n ?? 0) as any) || 0
  const obrasIniciadasHoje = Number((obrasHoje?.[0]?.n ?? 0) as any) || 0
  const comprasPendentesN = Number((comprasPendentes?.[0]?.n ?? 0) as any) || 0

  const valorObrasMes = n(valorMes?.[0]?.total)
  const valorObrasMesAnterior = n(valorMesAnt?.[0]?.total)
  const valorObrasVsMesAnteriorPercent = pct(valorObrasMes, valorObrasMesAnterior)

  const [ultimasObrasRows, ultimosOrcRows] = await Promise.all([
    prisma.obras.findMany({
      orderBy: [{ data_criacao: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        tipo_obra: true,
        titulo: true,
        status: true,
        data_criacao: true,
        cliente: { select: { nome: true, bairro: true, cidades: { select: { nome: true } } } },
        equipe: { select: { nome: true } },
      },
    }),
    prisma.orcamento.findMany({
      where: { excluido: false },
      orderBy: [{ data_criacao: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        titulo: true,
        data_criacao: true,
        cliente: { select: { bairro: true, cidades: { select: { nome: true } } } },
        tipo_obra: { select: { tipo_obra: true } },
      },
    }),
  ])

  const ultimasObras: HomeUltimaObraDTO[] = ultimasObrasRows.map((o) => ({
    id: o.id,
    cliente: {
      nome: o.cliente.nome,
      bairro: o.cliente.bairro ?? null,
      cidade: o.cliente.cidades?.nome ?? null,
    },
    titulo: o.titulo ?? null,
    tipo_obra: o.tipo_obra,
    equipe: o.equipe?.nome ?? null,
    status: String(o.status),
    data_criacao: o.data_criacao ? new Date(o.data_criacao).toISOString() : null,
  }))

  const ultimosOrcamentos: HomeUltimoOrcamentoDTO[] = ultimosOrcRows.map((o) => ({
    id: o.id,
    titulo: o.titulo ?? null,
    bairro: o.cliente.bairro ?? null,
    cidade: o.cliente.cidades?.nome ?? null,
    tipo_obra: o.tipo_obra?.tipo_obra ?? null,
    data_criacao: o.data_criacao ? new Date(o.data_criacao).toISOString() : null,
  }))

  return {
    indicadores: {
      orcamentosMes,
      orcamentosSemana,
      orcamentosMesAnterior,
      orcamentosVsMesAnteriorPercent,

      obrasAtivas: obrasAtivasN,
      obrasIniciadasHoje,
      comprasPendentes: comprasPendentesN,

      valorObrasMes,
      valorObrasMesAnterior,
      valorObrasVsMesAnteriorPercent,
    },
    ultimasObras,
    ultimosOrcamentos,
  }
}
