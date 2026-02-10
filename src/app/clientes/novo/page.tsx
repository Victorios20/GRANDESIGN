export const dynamic = "force-dynamic"
export const revalidate = 0

import ClienteForm from "@/components/clientes/ClienteForm"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"

export default async function Page() {
    const cidades = await getCidadesDB()

    return (
        <ClienteForm
            initialData={null}
            listaCidades={cidades}
        />
    )
}
