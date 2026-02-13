import { Metadata } from "next"
import OrcadoRealizadoDashboard from "./components/OrcadoRealizadoDashboard"

export const metadata: Metadata = {
    title: "Orçado vs Realizado | GRANDESIGN",
    description: "Relatório financeiro de orçado vs realizado da obra",
}

export default async function OrcadoRealizadoPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    // We can do server-side pre-fetching here if desired, 
    // but the client dashboard fetches its own data for better interactivity (recalculate).
    // Just awaiting params to satisfy Next.js 15
    await params

    return <OrcadoRealizadoDashboard />
}
