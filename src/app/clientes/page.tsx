export const dynamic = "force-dynamic"

import ClientesClient from "./ClientesClient"
import { ssrJSON } from "@/lib/ssrFetch"

export default async function Page() {
    const [listaCidades, lista] = await Promise.all([
        ssrJSON<{ id: number; nome: string }[]>("/api/cidades"),
        ssrJSON<{ dados: any[]; total: number }>("/api/clientes?page=1&perPage=20&ordem=nome_asc"),
    ])

    return <ClientesClient initial={{ listaCidades: listaCidades || [], dados: lista.dados || [], total: lista.total || 0 }} />
}
