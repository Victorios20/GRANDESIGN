export const dynamic = "force-dynamic"
export const revalidate = 0

import { notFound } from "next/navigation"
import ClienteForm from "@/components/clientes/ClienteForm"
import { getCliente } from "@/actions/clientes-db/clientes-db"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const clienteId = Number(id)

    if (!Number.isFinite(clienteId)) {
        notFound()
    }

    const [cliente, cidades] = await Promise.all([
        getCliente(clienteId),
        getCidadesDB(),
    ])

    if (!cliente) {
        notFound()
    }

    return (
        <ClienteForm
            initialData={cliente}
            listaCidades={cidades}
        />
    )
}
