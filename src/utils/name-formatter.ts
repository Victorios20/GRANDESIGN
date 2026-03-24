
export function formatClientName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length <= 1) return parts[0] || ""
    // Capitalize first letters just in case
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

    const first = capitalize(parts[0])
    const last = capitalize(parts[parts.length - 1])

    return `${first} ${last}`
}

export function formatLocation(bairro: string, cidade: string): string {
    const b = bairro.trim()
    const c = cidade.trim()

    if (!b) return c
    if (b.toLowerCase() === "centro") return c

    return b
}

export function formatObraTitle(clienteNome: string, bairro: string, cidade: string): string {
    const name = formatClientName(clienteNome)
    const loc = formatLocation(bairro, cidade)
    return `${name} [${loc}]`
}
