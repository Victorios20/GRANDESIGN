export type ReportCategoryKey =
    | "MADEIRAS"
    | "MATERIAIS_GERAIS"
    | "COMISSAO"
    | "FRETE"
    | "EMPRESA_PS"
    | "EMPRESA_GD"
    | "TELHAS"
    | "TAXA_CARTAO"
    | "OUTROS"

export type ReportBudgetField =
    | "madeira_previsto"
    | "materiais_previsto"
    | "comissao_previsto"
    | "frete_previsto"
    | "empresa_ps_previsto"
    | "empresa_gd_previsto"
    | "telha_previsto"
    | "andaime_previsto"

export type ReportCategoryDefinition = {
    key: ReportCategoryKey
    label: string
    budgetField: ReportBudgetField | null
}

export const REPORT_CATEGORIES: ReportCategoryDefinition[] = [
    { key: "MADEIRAS", label: "Madeiras", budgetField: "madeira_previsto" },
    { key: "MATERIAIS_GERAIS", label: "Materiais Gerais", budgetField: "materiais_previsto" },
    { key: "COMISSAO", label: "Comissão", budgetField: "comissao_previsto" },
    { key: "FRETE", label: "Frete", budgetField: "frete_previsto" },
    { key: "EMPRESA_PS", label: "Empresa PS", budgetField: "empresa_ps_previsto" },
    { key: "EMPRESA_GD", label: "Empresa GD", budgetField: "empresa_gd_previsto" },
    { key: "TELHAS", label: "Telhas", budgetField: "telha_previsto" },
    { key: "TAXA_CARTAO", label: "Taxa de Cartão", budgetField: null },
    { key: "OUTROS", label: "Outros", budgetField: "andaime_previsto" },
]

export const REPORT_CATEGORY_KEYS = REPORT_CATEGORIES.map((category) => category.key)

function normalizeCategoryName(categoryName: string) {
    return categoryName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}

export const CategoryMapping = {
    getKey(categoryName: string): ReportCategoryKey {
        const lower = normalizeCategoryName(categoryName)

        if (lower.includes("taxa") && lower.includes("cartao")) return "TAXA_CARTAO"
        if (lower.includes("madeira")) return "MADEIRAS"
        if (lower.includes("telha")) return "TELHAS"
        if (lower.includes("comissao")) return "COMISSAO"
        if (lower.includes("frete")) return "FRETE"
        if (lower.includes("empresa ps") || lower.includes("mao de obra") || lower.includes("pedreiro")) return "EMPRESA_PS"
        if (lower.includes("empresa gd") || lower.includes("margem")) return "EMPRESA_GD"
        if (lower.includes("material") || lower.includes("materiais") || lower.includes("compra de material")) {
            return "MATERIAIS_GERAIS"
        }

        return "OUTROS"
    },
}
