// src/actions/salvar/orcamento/db/salvar-orcamento-db.ts
import { supabase } from "@/supabase/client"
import type { Material } from '@/app/gerar-orcamento/page'

export async function salvarOrcamento(params: {
    cliente: {
        nome: string
        telefone: string
        bairro: string
        cidade: string
    }
    parametros: {
        tipoObra: string
        largura: number
        comprimento: number
    }
    materiais: {
        madeiras: Material[]
        materiaisGerais: Material[]
        telhas: Material[]
    }
    totais: {
        madeiras: number
        materiais: number
        comissao: number
        frete: number
        empresaPS: number
        empresaGD: number
    }
    telhaValores: Record<string, { pix: number; x10: number; x18: number }>
    links: { slideUrl: string; pdfUrl: string }
}) {
    const { cliente, parametros, materiais, totais, telhaValores, links } = params
    console.log("[DEBUG] Materiais recebidos:", materiais.madeiras)


    const cidade = await supabase
        .from('cidades')
        .select('id')
        .eq('nome', cliente.cidade)
        .single()
    if (!cidade.data) throw new Error('Cidade não encontrada')

    const novoCliente = await supabase
        .from('cliente')
        .insert({
            nome: cliente.nome,
            telefone: cliente.telefone,
            bairro: cliente.bairro,
            cidade_id: cidade.data.id,
        })
        .select('id')
        .single()
    if (!novoCliente.data) throw new Error('Erro ao salvar cliente')

    const tipoObra = await supabase
        .from('tipo_obra')
        .select('id')
        .eq('tipo_obra', parametros.tipoObra)
        .single()
    if (!tipoObra.data) throw new Error('Tipo de obra não encontrado')

    const orcamento = await supabase
        .from('orcamento')
        .insert({
            cliente_id: novoCliente.data.id,
            tipo_obra_id: tipoObra.data.id,
            totais_madeiras_preco: totais.madeiras,
            totais_materiais_preco: totais.materiais,
            totais_comissao_preco: totais.comissao,
            totais_empresa_ps_preco: totais.empresaPS,
            totais_empresa_gd_preco: totais.empresaGD,
            totais_frete_preco: totais.frete,
            largura: parametros.largura,
            comprimento: parametros.comprimento,
            link_slide: links.slideUrl,
            link_pdf: links.pdfUrl,
        })
        .select('id')
        .single()
    if (!orcamento.data) throw new Error('Erro ao salvar orçamento')

    const orcamentoId = orcamento.data.id

    const materiaisToInsert = [
        ...materiais.madeiras.map(m => ({
            orcamento_id: orcamentoId,
            tipo: 'madeira',
            descricao: m.nome,
            componente: m.componente,
            quantidade: m.quantidade,
            preco_unitario: m.preco,
            tamanho: m.tamanho !== undefined && m.tamanho !== null
                ? Number(String(m.tamanho).replace(",", "."))
                : null,
            total:
                m.tamanho !== undefined && m.tamanho !== null
                    ? Number(String(m.tamanho).replace(",", ".")) * m.quantidade * m.preco
                    : 0,
            frete: 0,
        })),
        ...materiais.materiaisGerais.map(m => ({
            orcamento_id: orcamentoId,
            tipo: 'geral',
            descricao: m.nome,
            quantidade: m.quantidade,
            preco_unitario: m.preco,
            tamanho: null,
            componente: null,
            total: m.quantidade * m.preco,
            frete: 0,
        })),
        ...materiais.telhas.map(m => ({
            orcamento_id: orcamentoId,
            tipo: 'telha',
            descricao: m.nome,
            quantidade: m.quantidade,
            preco_unitario: m.preco,
            tamanho: null,
            componente: null,
            total: m.quantidade * m.preco + (m.frete ?? 0),
            frete: m.frete ?? 0,
        })),
    ]

    const r1 = await supabase.from('orcamento_material').insert(materiaisToInsert)
    if (r1.error) throw new Error('Erro ao salvar materiais')

    const pagamentosToInsert = Object.entries(telhaValores).flatMap(([tipo, val]) => [
        { orcamento_id: orcamentoId, tipo_telhas: tipo, metodo_pagamento: 'pix', valor: val.pix },
        { orcamento_id: orcamentoId, tipo_telhas: tipo, metodo_pagamento: 'x10', valor: val.x10 },
        { orcamento_id: orcamentoId, tipo_telhas: tipo, metodo_pagamento: 'x18', valor: val.x18 },
    ])

    const r2 = await supabase.from('orcamento_pagamento').insert(pagamentosToInsert)
    if (r2.error) throw new Error('Erro ao salvar pagamentos')

    return orcamentoId
}
