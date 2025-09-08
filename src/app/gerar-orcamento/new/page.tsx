// src/app/gerar-orcamento/new/page.tsx

// 👇 Adicione estas duas linhas para impedir SSG/ISR e evitar tocar no DB no build
export const dynamic = 'force-dynamic'
export const revalidate = 0 // sobrescreve o revalidate anterior

import OrcamentoPage from "../_components/OrcamentoPage"

// DB (server) – chamamos direto, sem HTTP
import { listarTiposObra } from "@/actions/tipo-obra-db/tipo-obra-db"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisPorTipoDB } from "@/actions/materiais-db/materiais-db"

// ❌ remova esta linha antiga se ela ainda estiver no arquivo:
// export const revalidate = 600

export default async function Page() {
  // Carrega catálogos em paralelo (agora só em runtime)
  const [tiposObra, cidades, componentes, madeirasDB, geraisDB, telhasDB] = await Promise.all([
    listarTiposObra(),
    getCidadesDB(),
    listarComponentesDB(),
    listarMateriaisPorTipoDB("madeira"),
    listarMateriaisPorTipoDB("geral"),
    listarMateriaisPorTipoDB("telha"),
  ])

  const catalogo = {
    madeiras: madeirasDB.map((m) => ({ nome: m.descricao, preco: m.preco_unitario })),
    materiaisGerais: geraisDB.map((m) => ({ nome: m.descricao, preco: m.preco_unitario })),
    telhas: telhasDB.map((m) => ({ nome: m.descricao, preco: m.preco_unitario })),
  }

  return (
    <OrcamentoPage
      catalogo={catalogo}
      componentes={componentes}
      tiposObra={tiposObra}
      cidades={cidades}
    />
  )
}
