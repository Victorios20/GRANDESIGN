/**
 * Filtro de busca das listas financeiras: sempre por descrição e,
 * quando o termo é um inteiro positivo (aceita prefixo #), também por ID.
 */
export function buildSearchWhere(search: string) {
    const term = search.trim()
    const digits = term.replace(/^#/, "")
    const asId = /^\d+$/.test(digits) ? Number(digits) : null

    return {
        OR: [
            { descricao: { contains: term, mode: "insensitive" as const } },
            ...(asId && asId > 0 ? [{ id: asId }] : []),
        ],
    }
}
