import { getTeamPerformance } from "@/actions/performance/get-team-performance"
import EquipePerformanceClient from "./_components/EquipePerformanceClient"
import { Metadata } from "next"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Performance da Equipe - Grandesign",
  description: "Acompanhamento diário e produtividade da equipe.",
}

export default async function EquipePerformancePage() {
  const initialData = await getTeamPerformance()

  return <EquipePerformanceClient initialData={initialData} />
}
