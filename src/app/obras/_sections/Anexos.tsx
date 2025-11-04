"use client"

import { ObraDetalhada } from "../lib/types"

type Props = {
  data: ObraDetalhada
}

export default function Anexos({ data }: Props) {
  const a = data.anexos
  return (
    <section className="w-full">
      <h3 className="text-2xl font-semibold text-marromEscuro mb-4">Anexo/documentos relacionados</h3>
      <ul className="space-y-2 text-marromEscuro">
        <li>{a.orcamento || "Orçamento"}</li>
        <li>{a.contrato || "Contrato"}</li>
        <li>{a.proposta || "Proposta"}</li>
        <li>{a.ordemServico || "Ordem de serviço"}</li>
      </ul>
    </section>
  )
}
