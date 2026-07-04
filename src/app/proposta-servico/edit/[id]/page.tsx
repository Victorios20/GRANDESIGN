import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getProposta } from "@/actions/proposta-servico"
import PropostaForm from "../../_components/PropostaForm"

export const dynamic = "force-dynamic"

export default async function EditarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposta = await getProposta(Number(id))
  if (!proposta) notFound()
  const clientes = await prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } })

  return (
    <PropostaForm
      clientes={clientes}
      initial={{
        id: proposta.id,
        titulo: proposta.titulo,
        cliente_id: proposta.cliente_id,
        descricao_servico: proposta.descricao_servico,
        dimensoes: proposta.dimensoes,
        itens: proposta.itens.map((i) => i.descricao),
        custo_mao_obra: proposta.custo_mao_obra,
        custo_materiais: proposta.custo_materiais,
        custo_frete: proposta.custo_frete,
        lucro: proposta.lucro,
        forma_pagamento: proposta.forma_pagamento,
        prazo_execucao: proposta.prazo_execucao,
        validade: proposta.validade ? proposta.validade.toISOString().slice(0, 10) : "",
        observacoes: proposta.observacoes,
      }}
    />
  )
}
