
import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AgendaEditor } from "@/components/agenda/AgendaEditor"
import type { AgendaSegmentInput } from "@/actions/obras/update-agenda"

type EquipeOption = {
    id: number
    nome: string
    cor: string | null
}

type Props = {
    obraId: number
    agenda: Array<{
        id: number
        start: string
        end: string
        tipo: string
        status: string
        equipe: { id: number } | null
        observacoes: string | null
    }>
    equipes: EquipeOption[]
    isEditing?: boolean
    obraStatus?: string
    // New props for bubbling up
    onChange?: (segments: AgendaSegmentInput[]) => void
    onValidationChange?: (isValid: boolean, error?: string | null) => void
    className?: string
}

export default function AgendaObra({ obraId, agenda, equipes, isEditing = false, obraStatus, onChange, onValidationChange, className }: Props) {
    const router = useRouter()

    const initialSegments: AgendaSegmentInput[] = useMemo(() => agenda.map(s => ({
        id: s.id,
        start: s.start,
        end: s.end,
        tipo: s.tipo,
        status: s.status,
        equipeId: s.equipe?.id ?? null,
        observacoes: s.observacoes
    })), [agenda])

    // We don't handle success here anymore, it's externalized.
    // const handleSuccess = () => { ... }

    return (
        <Card id="agenda" className={`rounded-2xl shadow-sm bg-white border-0 ${className ?? ""}`}>
            <CardHeader className="pb-3 border-b bg-white">
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-green" />
                    <div>
                        <CardTitle className="text-xl text-green">Agenda & Histórico</CardTitle>
                        <CardDescription>
                            Gerencie períodos de execução e manutenção.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                <AgendaEditor
                    obraId={obraId}
                    initialSegments={initialSegments}
                    equipes={equipes}
                    // onSuccess={handleSuccess} // Removed
                    readOnly={!isEditing}
                    obraStatus={obraStatus}
                    onChange={onChange}
                    onValidationChange={onValidationChange}
                />
            </CardContent>
        </Card>
    )
}
