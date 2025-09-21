export const dynamic = "force-dynamic"
export const revalidate = 0

import OrcamentoPage from "../_components/OrcamentoPage"

import { listarTiposObra } from "@/actions/tipo-obra-db/tipo-obra-db"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"

export default async function Page() {
  const [tiposObra, cidades, componentes, geraisDB, telhasDB] = await Promise.all([
    listarTiposObra(),
    getCidadesDB(),
    listarComponentesDB(),
    listarMateriaisGerais(),
    listarTelhas(),
  ])

  const catalogo = {
  madeiras: [], // madeiras agora vêm no client por fornecedor selecionado
  materiaisGerais: geraisDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
  telhas: telhasDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
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
