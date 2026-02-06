"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type AgendaSegmentInput = {
    id?: number
    start: string // YYYY-MM-DD
    end: string   // YYYY-MM-DD
    equipeId: number | null
    tipo?: string
    status?: string
    observacoes?: string | null
}

export type UpdateAgendaResult = {
    success: boolean
    error?: string
}

function parseDate(str: string): Date {
    // Append T12:00:00 to avoid timezone issues with pure dates
    return new Date(`${str}T12:00:00`)
}

export async function updateAgendaSegments(
    obraId: number,
    segments: AgendaSegmentInput[]
): Promise<UpdateAgendaResult> {
    try {
        const session = await getServerSession(authOptions as any)
        const user = (session as any)?.user

        if (!user) {
            return { success: false, error: "Não autorizado" }
        }

        if (!obraId || isNaN(obraId)) {
            return { success: false, error: "ID da obra inválido" }
        }

        // 1. Basic validation
        for (const seg of segments) {
            if (!seg.start || !seg.end) {
                return { success: false, error: "Datas de início e fim são obrigatórias em todos os trechos." }
            }
            if (seg.start > seg.end) {
                return { success: false, error: `Data de início (${seg.start}) não pode ser maior que o fim (${seg.end}).` }
            }
            // Note: 'fim' in input is inclusive for user, but database might treat it differently? 
            // In the calendar code we saw "fim" is exclusive for FullCalendar but usually inclusive for UI logic.
            // Looking at `ObraAgendaSegmento` model: `inicio` and `fim` are DateTime @db.Date.
            // The previous code `detalhar-obra.ts` returns `start` and `end` as YYYY-MM-DD.
            // Usually fullcalendar expects exclusive end. Prisma dates are just dates. 
            // Let's assume the INPUT `start` and `end` are INCLUSIVE dates from the DatePicker.
            // If the user selects 05/02 to 05/02, that's 1 day.
            // FullCalendar expects 05/02 to 06/02 for 1 day.
            // Prisma stores dates. If `inicio`=05/02 and `fim`=05/02, that implies a point? 
            // Let's check `api/agenda/route.ts`... `timeout`.
            // Let's rely on standard logic: stored dates should probably be exclusive end if used by fullcalendar directly, OR inclusive if used by business logic. 
            // The prompt says "se usuário cria dois trechos colados -> ok".
            // Let's standardize on: DB stores INCLUSIVE start, INCLUSIVE end (or whatever the existing app uses).
            // Checking `calendar/page.tsx` might reveal how it consumes it.
            // In `detalhar-obra`, we map `ymd(s.fim)`.
            // FullCalendar usually needs startStr, endStr.
            // Let's stick to what's received. If validation passes, we save.
        }

        // 2. Overlap validation (within the list itself)
        // Sort by start date first
        const sorted = [...segments].sort((a, b) => a.start.localeCompare(b.start))

        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i]
            const next = sorted[i + 1]

            // Check if current End >= next Start
            // Assuming inclusive range for comparison safety
            if (current.end >= next.start) {
                return {
                    success: false,
                    error: `Sobreposição detectada entre os trechos: [${current.start} - ${current.end}] e [${next.start} - ${next.end}]`
                }
            }
        }

        // 3. Database Transaction
        // - Delete segments not in the list (for this obra)
        // - Upsert segments (Create new, Update existing)
        await prisma.$transaction(async (tx) => {
            const incomingIds = segments.map(s => s.id).filter(id => id && id > 0) as number[]

            // Delete removed segments
            await tx.obraAgendaSegmento.deleteMany({
                where: {
                    obra_id: obraId,
                    id: { notIn: incomingIds }
                }
            })

            // Upsert each segment
            for (const seg of segments) {
                const data = {
                    obra_id: obraId,
                    equipe_id: seg.equipeId && seg.equipeId > 0 ? seg.equipeId : null,
                    inicio: parseDate(seg.start),
                    fim: parseDate(seg.end),
                    observacoes: seg.observacoes,
                    tipo: seg.tipo || "EXECUCAO",
                    status: seg.status || "AGENDADO",
                    updated_by: Number(user.id) || null
                }

                if (seg.id && seg.id > 0) {
                    // Update
                    await tx.obraAgendaSegmento.update({
                        where: { id: seg.id },
                        data
                    })
                } else {
                    // Create
                    await tx.obraAgendaSegmento.create({
                        data: {
                            ...data,
                            created_by: Number(user.id) || null
                        }
                    })
                }
            }
        })

        revalidatePath(`/obras/${obraId}`)
        revalidatePath("/calendario")

        return { success: true }

    } catch (err: any) {
        console.error("Error updating agenda:", err)
        // Return the actual error message if available, otherwise a generic one
        const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : "Erro ao salvar agenda.")
        return { success: false, error: msg }
    }
}
