// src/app/gerar-orcamento/edit/[id]/page.tsx
import { notFound } from "next/navigation"
import OrcamentoPage, { type InitialData } from "../../_components/OrcamentoPage"

// DB (server)
import { listarTiposObra } from "@/actions/tipo-obra-db/tipo-obra-db"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"
import { getOrcamentoById, type GetOrcamentoResult } from "@/actions/edit-orcamento-db/edit-orcamento-db"

// Opcional: revalidate em 5 min para catálogos
export const revalidate = 300

function toInitialData(data: GetOrcamentoResult): InitialData {
  const mapMat = (arr: GetOrcamentoResult["materiais"]["madeiras"]) =>
    arr.map((m) => ({
      id: m.id ?? 0,
      nome: m.nome ?? "",
      componente: (m.componente ?? "") || "",
      quantidade: m.quantidade ?? 0,
      preco: m.preco ?? 0,
      tamanho: m.tamanho == null ? "" : m.tamanho,
      frete: m.frete == null ? undefined : m.frete,
    }))

  return {
    id: data.id,

    // garante que o componente receba o id do cliente já associado
    clienteId: (data as any).clienteId ?? data.clienteId ?? 0,

    // >>> ADIÇÃO: preenche fornecedor para o client pré-selecionar
    fornecedorId:
      (data as any).fornecedorId != null
        ? Number((data as any).fornecedorId)
        : (data as any).fornecedor?.id != null
        ? Number((data as any).fornecedor.id)
        : null,
    fornecedorNome:
      (data as any).fornecedor?.nome ??
      (typeof (data as any).fornecedorNome === "string" ? (data as any).fornecedorNome : null),

    titulo: data.titulo ?? "",
    cliente: {
      nome: data.cliente?.nome ?? "",
      telefone: data.cliente?.telefone ?? "",
      bairro: data.cliente?.bairro ?? "",
      cidade: data.cliente?.cidade ?? "",
    },
    parametros: {
      tipoObra: data.parametros?.tipoObra ?? "",
      largura: data.parametros?.largura ?? null,
      comprimento: data.parametros?.comprimento ?? null,
      larguraMaior: data.parametros?.larguraMaior ?? null,
      larguraMenor: data.parametros?.larguraMenor ?? null,
      comprimentoMaior: data.parametros?.comprimentoMaior ?? null,
      comprimentoMenor: data.parametros?.comprimentoMenor ?? null,
    },
    materiais: {
      madeiras: mapMat(data.materiais.madeiras),
      materiaisGerais: mapMat(data.materiais.materiaisGerais),
      telhas: mapMat(data.materiais.telhas),
    },
    totais: {
      madeiras: data.totais?.madeiras ?? 0,
      materiais: data.totais?.materiais ?? 0,
      comissao: data.totais?.comissao ?? 0,
      frete: data.totais?.frete ?? 0,
      empresaPS: data.totais?.empresaPS ?? 0,
      empresaGD: data.totais?.empresaGD ?? 0,
    },
    telhaValores: data.telhaValores ?? {},
    links: {
      slideUrl: data.links?.slideUrl ?? null,
      pdfUrl: data.links?.pdfUrl ?? null,
      slide: undefined,
      pdf: undefined,
    },
  }
}

export default async function Page(context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    notFound()
  }

  const [tiposObra, cidades, componentes, geraisDB, telhasDB, orc] = await Promise.all([
    listarTiposObra(),
    getCidadesDB(),
    listarComponentesDB(),
    listarMateriaisGerais(),
    listarTelhas(),
    getOrcamentoById(id),
  ])

  const catalogo = {
    madeiras: [], // madeiras agora vêm no client por fornecedor selecionado
    materiaisGerais: geraisDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
    telhas: telhasDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
  }

  const initialData = toInitialData(orc)

  // DEBUG útil
  console.log("[EDIT] id:", id)
  console.log("[EDIT] fornecedor vindo do servidor:", {
    fornecedorId: (orc as any).fornecedorId ?? (orc as any).fornecedor?.id ?? null,
    fornecedor: (orc as any).fornecedor ?? null,
  })
  console.log("[EDIT] initialData fornecedor:", {
    fornecedorId: initialData.fornecedorId,
    fornecedorNome: initialData.fornecedorNome,
  })

  return (
    <OrcamentoPage
      mode="edit"
      orcamentoId={id}
      initialData={initialData}
      catalogo={catalogo}
      componentes={componentes}
      tiposObra={tiposObra}
      cidades={cidades}
    />
  )
}
