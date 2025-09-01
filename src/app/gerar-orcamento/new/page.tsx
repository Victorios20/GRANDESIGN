// src/app/gerar-orcamento/new/page.tsx
import OrcamentoPage from "../_components/OrcamentoPage"

// DB (server) – chamamos direto, sem HTTP
import { listarTiposObra } from "@/actions/tipo-obra-db/tipo-obra-db"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisPorTipoDB } from "@/actions/materiais-db/materiais-db"

// Opcional: revalidate em 10 min pros catálogos
export const revalidate = 600

export default async function Page() {
  // Carrega catálogos em paralelo
  const [tiposObra, cidades, componentes, madeirasDB, geraisDB, telhasDB] = await Promise.all([
    listarTiposObra(),
    getCidadesDB(),
    listarComponentesDB(),
    listarMateriaisPorTipoDB("madeira"),
    listarMateriaisPorTipoDB("geral"),
    listarMateriaisPorTipoDB("telha"),
  ])

  // Adapta shape do catálogo para o componente (nome/preco)
  const catalogo = {
    madeiras: madeirasDB.map((m) => ({ nome: m.descricao, preco: m.preco_unitario })),
    materiaisGerais: geraisDB.map((m) => ({ nome: m.descricao, preco: m.preco_unitario })),
    telhas: telhasDB.map((m) => ({ nome: m.descricao, preco: m.preco_unitario })),
  }

  return (
    <OrcamentoPage
      // mode default já é "create"
      catalogo={catalogo}
      componentes={componentes}
      tiposObra={tiposObra}
      cidades={cidades}
    />
  )
}
