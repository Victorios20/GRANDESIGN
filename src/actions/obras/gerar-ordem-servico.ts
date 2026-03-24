"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

function toNumberOrNull(value: unknown) {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

export async function gerarOrdemServicoWebhook(obraId: number) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            throw new Error("Não autenticado")
        }

        // 1. Fetch complete Obra data
        const obra = await prisma.obras.findUnique({
            where: { id: obraId },
            include: {
                cliente: true,
                orcamento: true,
                pedidos_compra: {
                    include: {
                        itens: true,
                    },
                },
                segmentos: {
                    orderBy: { inicio: "asc" },
                    take: 1,
                    include: {
                        equipe: true,
                    },
                },
            },
        }) as any

        if (!obra) {
            throw new Error("Obra não encontrada")
        }

        // 2. Extract Data
        const equipe = obra.segmentos?.[0]?.equipe
        const equipeNome = equipe?.nome || "Sem equipe definida"

        // Wood List (Category 'MADEIRA')
        const pedidosMadeira = obra.pedidos_compra.filter((p: any) =>
            String(p.categoria ?? "").toUpperCase() === "MADEIRA"
        )
        const listaMadeiras = pedidosMadeira.flatMap((p: any) =>
            p.itens.map((i: any) => ({
                quantidade: Number(i.quantidade),
                descricao: i.descricao,
                tamanho: i.tamanho ? `${i.tamanho}m` : "-",
                componente: i.componente || "-"
            }))
        )

        // Tile Quantity (Category 'TELHA' or 'TELHAS')
        const pedidosTelha = obra.pedidos_compra.filter((p: any) => {
            const cat = String(p.categoria ?? "").toUpperCase()
            return cat === "TELHA" || cat === "TELHAS"
        })

        const quantidadeTelhas = pedidosTelha.reduce((acc: number, p: any) => {
            const sumItens = p.itens.reduce((s: number, i: any) => s + Number(i.quantidade), 0)
            return acc + sumItens
        }, 0)

        const payload = {
            obraId: obra.id,
            titulo: obra.titulo || `Obra #${obra.id}`,
            equipe: equipeNome,
            valorMaoDeObra: Number(obra.valor_mao_de_obra ?? 0),
            listaMadeiras,
            telha: obra.telha_escolhida,
            quantidadeTelhas,
            dimensoes: `${obra.largura ?? 0} x ${obra.comprimento ?? 0}`,
            larguraMaior: toNumberOrNull(obra.largura_maior),
            larguraMenor: toNumberOrNull(obra.largura_menor),
            comprimentoMaior: toNumberOrNull(obra.comprimento_maior),
            comprimentoMenor: toNumberOrNull(obra.comprimento_menor),
            tipoObra: obra.tipo_obra,
            orcamentoOrigemId: obra.orcamento_id,
            cliente: {
                nome: obra.cliente.nome,
                bairro: obra.cliente.bairro,
                cidade: obra.cliente.cidade_id, // You might need to fetch city name if ID is stored
                telefone: obra.cliente.telefone // NEW
            },
            enderecoObra: obra.endereco_obra,
            mapsUrl: obra.maps_url // NEW
        }

        // 3. Send to Webhook
        const webhookUrl = process.env.N8N_WEBHOOK_URL_ORDEM_SERVICO
        if (!webhookUrl) {
            throw new Error("URL do webhook de Ordem de Serviço não configurada (N8N_WEBHOOK_URL_ORDEM_SERVICO)")
        }

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            const text = await response.text().catch(() => "")
            throw new Error(`Falha no webhook: ${response.status} ${response.statusText} - ${text}`)
        }

        const data = await response.json().catch(() => ({}))

        // Helper to pick URL from response (similar to contract logic)
        const pickUrl = (d: any) => {
            // Handle N8N returning an array
            if (Array.isArray(d)) {
                d = d[0]
            }
            if (!d) return null

            const cands = [d?.osDocUrl, d?.url, d?.link, d?.osUrl, d?.ordem_servico_url, d?.data?.url, d?.data?.link]
            for (const c of cands) {
                if (typeof c === "string" && c.trim() !== "") return c.trim()
            }
            return null
        }

        const linkUrl = pickUrl(data)

        if (linkUrl) {
            await prisma.obras.update({
                where: { id: obraId },
                data: { link_ordem_servico: linkUrl }
            })
        }

        return { success: true, url: linkUrl }
    } catch (error: any) {
        console.error("Erro ao gerar ordem de serviço:", error)
        return { success: false, error: error.message || "Erro desconhecido" }
    }
}
