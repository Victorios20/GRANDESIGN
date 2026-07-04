import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProposta } from "@/actions/proposta-servico"
import { PropostaServicoDocument } from "@/lib/pdf/PropostaServicoPDF"
import { formatPropostaNumero } from "@/lib/proposta-utils"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const proposta = await getProposta(Number(id))
  if (!proposta) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 })

  const numero = formatPropostaNumero(proposta.id)
  const buffer = await renderToBuffer(
    PropostaServicoDocument({
      data: {
        numero,
        titulo: proposta.titulo,
        clienteNome: proposta.cliente?.nome ?? "",
        descricaoServico: proposta.descricao_servico,
        dimensoes: proposta.dimensoes,
        itens: proposta.itens.map((i) => i.descricao),
        valorFinal: Number(proposta.valor_final),
        formaPagamento: proposta.forma_pagamento,
        prazoExecucao: proposta.prazo_execucao,
        validade: proposta.validade ? proposta.validade.toLocaleDateString("pt-BR") : null,
      },
    }),
  )

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Proposta-${numero}.pdf"`,
    },
  })
}
