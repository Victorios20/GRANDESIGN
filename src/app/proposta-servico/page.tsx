import { listPropostas } from "@/actions/proposta-servico"
import PropostaListClient from "./_components/PropostaListClient"

export const dynamic = "force-dynamic"

export default async function PropostaServicoPage() {
  const propostas = await listPropostas()
  const items = propostas.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    cliente: p.cliente?.nome ?? "—",
    valor_final: Number(p.valor_final),
    status: p.status,
    created_at: p.created_at.toISOString(),
  }))
  return <PropostaListClient items={items} />
}
