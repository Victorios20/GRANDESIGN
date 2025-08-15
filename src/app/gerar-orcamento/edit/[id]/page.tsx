// src/app/gerar-orcamento/edit/[id]/page.tsx
import OrcamentoPage, { type InitialData } from "../../_components/OrcamentoPage"
// ⚠️ ajuste o caminho conforme o seu projeto:
import { getOrcamentoById } from "@/actions/edit-orcamento-db/edit-orcamento-db"
import { notFound } from "next/navigation"

type PageProps = { params: { id: string } }

export const metadata = {
  title: "Editar Orçamento",
  description: "Editar um orçamento existente",
}

export default async function EditOrcamentoPage({ params }: PageProps) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) notFound()

  const data = await getOrcamentoById(id).catch(() => null)
  if (!data) notFound()

  // Normaliza materiais: tamanho: null -> "", frete: null -> undefined
  const mapMat = (
    arr: { id: number; nome: string; componente: string; quantidade: number; preco: number; tamanho?: number | null; frete?: number | null }[],
  ) =>
    arr.map(m => ({
      ...m,
      tamanho: m.tamanho ?? "",          // <- OrcamentoPage espera string|number
      frete: m.frete ?? undefined,       // <- remove null
    }))

  const initialData: InitialData = {
    ...data,
    materiais: {
      madeiras: mapMat(data.materiais.madeiras),
      materiaisGerais: mapMat(data.materiais.materiaisGerais),
      telhas: mapMat(data.materiais.telhas),
    },
    links: {
      slide: data.links.slideUrl ?? undefined,
      pdf: data.links.pdfUrl ?? undefined,
      slideUrl: data.links.slideUrl,
      pdfUrl: data.links.pdfUrl,
    },
  }

  return (
    <OrcamentoPage
      mode="edit"
      orcamentoId={data.id}
      initialData={initialData}
    />
  )
}
