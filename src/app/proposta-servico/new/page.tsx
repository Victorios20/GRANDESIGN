import { prisma } from "@/lib/prisma"
import PropostaForm from "../_components/PropostaForm"

export const dynamic = "force-dynamic"

export default async function NovaPropostaPage() {
  const clientes = await prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } })
  return <PropostaForm clientes={clientes} />
}
