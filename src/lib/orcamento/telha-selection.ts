/**
 * Seleção de fornecedor por telha na tabela interna do orçamento.
 * Regra de negócio (Edson, 29/07/2026): todos os fornecedores visíveis,
 * default no mais barato, UM fornecedor por telha na proposta (troca, não soma).
 * O preço do fornecedor marcado alimenta o total da proposta (decisão "A").
 */
export type TelhaSelecionavel = {
    nome: string
    fornecedorId: number | null
    fornecedorNome?: string | null
    quantidade: number
    preco: number
    frete?: number | null
    proposta?: boolean
}

export function custoTelha(row: Pick<TelhaSelecionavel, "quantidade" | "preco" | "frete">): number {
    return row.quantidade * row.preco + (row.frete ?? 0)
}

export function marcarMaisBaratas<T extends TelhaSelecionavel>(rows: T[]): T[] {
    const cheapestIndexByName = new Map<string, number>()

    rows.forEach((row, index) => {
        const nome = row.nome.trim()
        if (!nome) return
        const currentIndex = cheapestIndexByName.get(nome)
        if (currentIndex === undefined || custoTelha(row) < custoTelha(rows[currentIndex])) {
            cheapestIndexByName.set(nome, index)
        }
    })

    return rows.map((row, index) => ({
        ...row,
        proposta: cheapestIndexByName.get(row.nome.trim()) === index,
    }))
}

export function selecionarFornecedor<T extends TelhaSelecionavel>(
    rows: T[],
    nome: string,
    fornecedorId: number | null,
): T[] {
    const alvo = nome.trim()
    return rows.map((row) =>
        row.nome.trim() === alvo
            ? { ...row, proposta: (row.fornecedorId ?? null) === fornecedorId }
            : row,
    )
}

export function linhasProposta<T extends TelhaSelecionavel>(rows: T[]): T[] {
    return rows.filter((row) => row.proposta !== false)
}
