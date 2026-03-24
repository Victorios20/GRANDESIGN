// src/app/home/page.tsx
export const dynamic = "force-dynamic"
export const revalidate = 0

import { headers as nextHeaders } from "next/headers"
import HomeClient from "./home/HomeClient"

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
  obrasIniciadasMes: number
  comprasPendentes: number

  valorObrasMes: number
  valorObrasMesAnterior: number
  valorObrasVsMesAnteriorPercent: number | null
}

type HomeIndicadoresResponse = {
  indicadores: HomeIndicadoresDTO
  ultimasObras: HomeUltimaObraDTO[]
  ultimosOrcamentos: HomeUltimoOrcamentoDTO[]
  requestId?: string
}

export default async function Page() {
  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/home/indicadores`, {
    cache: "no-store",
    headers: { cookie },
    credentials: "include",
    redirect: "manual",
  })

  if (res.status === 401 || res.status === 302 || res.status === 307 || res.status === 308) {
    return <div>Você precisa estar autenticado para acessar a home.</div>
  }

  if (!res.ok) {
    return <div>Erro ao carregar indicadores.</div>
  }

  const data = (await res.json()) as HomeIndicadoresResponse

  return (
    <HomeClient
      initial={{
        indicadores: data.indicadores,
        ultimasObras: data.ultimasObras,
        ultimosOrcamentos: data.ultimosOrcamentos,
      }}
    />
  )
}
