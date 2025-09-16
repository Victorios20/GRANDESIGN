export const dynamic = 'force-dynamic'
export const revalidate = 0 

import OrcamentoPage from "../_components/OrcamentoPage"


import { listarTiposObra } from "@/actions/tipo-obra-db/tipo-obra-db"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisPorTipoDB } from "@/actions/materiais-db/materiais-db"



export default async function Page() {

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
