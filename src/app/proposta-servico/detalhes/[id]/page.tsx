import Link from "next/link"
import { notFound } from "next/navigation"
import { getProposta } from "@/actions/proposta-servico"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/financeiro-utils"
import { formatPropostaNumero } from "@/lib/proposta-utils"

export const dynamic = "force-dynamic"

export default async function DetalhesPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposta = await getProposta(Number(id))
  if (!proposta) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Proposta nº {formatPropostaNumero(proposta.id)}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/proposta-servico/edit/${proposta.id}`}>Editar</Link>
          </Button>
          <Button asChild className="btn-primary">
            <a href={`/api/proposta-servico/${proposta.id}/pdf`} target="_blank" rel="noopener noreferrer">
              Gerar PDF
            </a>
          </Button>
        </div>
      </div>

      <Card className="space-y-2 p-4">
        <p className="text-lg font-medium">{proposta.titulo}</p>
        <p className="text-sm text-muted-foreground">Cliente: {proposta.cliente?.nome ?? "—"}</p>
        <p className="whitespace-pre-wrap">{proposta.descricao_servico}</p>
        {proposta.dimensoes ? <p className="text-sm">Dimensões: {proposta.dimensoes}</p> : null}
      </Card>

      {proposta.itens.length > 0 ? (
        <Card className="p-4">
          <p className="mb-2 font-semibold">Material incluso</p>
          <ul className="list-inside list-disc columns-2 text-sm">
            {proposta.itens.map((i) => (
              <li key={i.id}>{i.descricao}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-4">
        <p className="mb-2 font-semibold">Composição de custos</p>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Mão de obra:</span> {formatCurrency(proposta.custo_mao_obra)}
          </div>
          <div>
            <span className="text-muted-foreground">Materiais:</span> {formatCurrency(proposta.custo_materiais)}
          </div>
          <div>
            <span className="text-muted-foreground">Frete:</span> {formatCurrency(proposta.custo_frete)}
          </div>
          <div>
            <span className="text-muted-foreground">Lucro:</span> {formatCurrency(proposta.lucro)}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-2 font-semibold">Investimento</p>
        <p className="text-2xl font-semibold text-[#2E7D32]">{formatCurrency(proposta.valor_final)}</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Forma de pagamento:</span> {proposta.forma_pagamento || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Prazo:</span> {proposta.prazo_execucao || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Validade:</span>{" "}
            {proposta.validade ? proposta.validade.toLocaleDateString("pt-BR") : "—"}
          </div>
        </div>
      </Card>
    </div>
  )
}
