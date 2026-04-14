export type ReportCategoryKey =
    | "MADEIRA"
    | "TELHA"
    | "ANDAIME"
    | "MATERIAIS"
    | "MAO_DE_OBRA"
    | "OUTROS"

export const CategoryMapping = {
    /**
     * Determines the Report Key based on the Category Name (case-insensitive).
     */
    getKey(categoryName: string): ReportCategoryKey {
        const lower = categoryName.toLowerCase().trim()

        if (lower.includes("madeira")) return "MADEIRA"
        if (lower.includes("telha")) return "TELHA"
        if (lower.includes("andaime")) return "ANDAIME"
        if (lower.includes("mão de obra") || lower.includes("mao de obra") || lower.includes("pedreiro")) return "MAO_DE_OBRA"
        if (lower.includes("material") || lower.includes("materiais")) return "MATERIAIS"

        return "OUTROS"
    }
}
