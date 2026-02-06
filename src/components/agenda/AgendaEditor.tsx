"use client"

import { useMemo, useState, useEffect } from "react"
import { Plus, Trash2, Calendar, User, Copy, AlertTriangle, Wrench, Hammer, ArrowRight, Circle } from "lucide-react"
import { toast } from "sonner"
import { format, addDays, isValid, isBefore, startOfDay, intervalToDuration } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { updateAgendaSegments, AgendaSegmentInput } from "@/actions/obras/update-agenda"

// Helper to reliably parse YYYY-MM-DD
const parseYMD = (ymd: string) => {
    if (!ymd) return null
    const d = new Date(ymd + "T12:00:00")
    return isValid(d) ? d : null
}

const formatDate = (ymd: string) => {
    const d = parseYMD(ymd)
    if (!d) return ymd
    return format(d, "dd 'de' MMM", { locale: ptBR })
}

const formatDateFull = (ymd: string) => {
    const d = parseYMD(ymd)
    if (!d) return ymd
    return format(d, "dd 'de' MMMM, yyyy", { locale: ptBR })
}


export type EquipoOption = {
    id: number
    nome: string
    cor: string | null
}


type Props = {
    obraId: number
    initialSegments: AgendaSegmentInput[]
    equipes: EquipoOption[]
    // onSuccess?: () => void // Removed as save is external
    readOnly?: boolean
    obraStatus?: string
    // Controlled props
    onChange?: (segments: AgendaSegmentInput[]) => void
    onValidationChange?: (isValid: boolean, error?: string | null) => void
}

export function AgendaEditor({ obraId, initialSegments, equipes, readOnly = false, obraStatus, onChange, onValidationChange }: Props) {
    const isObraFinalizada = obraStatus === "Finalizado"

    // Use local state only if not controlled (fallback) or to manage internal edit drafts before propagation?
    // Actually, distinct UX: if controlled, we should probably just use the prop?
    // But usually editors have local state and emit onChange. 
    // Let's keep local state initialized from initialSegments, and emit onChange on every update.
    // If parent updates initialSegments, we should probably sync? Resetting state on props change is tricky.
    // For this refactor, let's assume `AgendaEditor` manages the *draft* state and notifies parent.

    const [segments, setSegments] = useState<AgendaSegmentInput[]>(
        initialSegments.length > 0
            ? initialSegments
            : [{
                id: -Date.now(),
                start: new Date().toISOString().slice(0, 10),
                end: new Date().toISOString().slice(0, 10),
                equipeId: null,
                tipo: "EXECUCAO",
                status: "AGENDADO",
                observacoes: ""
            }]
    )

    // Sync input props if they change externally (and are different from our current state)
    useEffect(() => {
        if (!initialSegments || initialSegments.length === 0) return

        // Check if the incoming segments are same as current state to avoid loops
        const areSame = segments.length === initialSegments.length &&
            segments.every((s, i) => {
                const is = initialSegments[i]
                return s.id === is.id &&
                    s.start === is.start &&
                    s.end === is.end &&
                    s.equipeId === is.equipeId &&
                    s.tipo === is.tipo &&
                    s.status === is.status &&
                    s.observacoes === is.observacoes
            })

        if (!areSame) {
            setSegments(initialSegments)
        }
    }, [initialSegments])


    // Sort: Start Date ASC
    const sortedSegments = useMemo(() => {
        return [...segments].sort((a, b) => a.start.localeCompare(b.start))
    }, [segments])

    const today = startOfDay(new Date())

    const { history, future } = useMemo(() => {
        const h: AgendaSegmentInput[] = []
        const f: AgendaSegmentInput[] = []

        sortedSegments.forEach(seg => {
            const end = parseYMD(seg.end)
            const isPast = end && isBefore(end, today)

            if (isPast) h.push(seg)
            else f.push(seg)
        })
        return { history: h, future: f }
    }, [sortedSegments, today])

    const overlapError = useMemo(() => {
        const activeSegments = sortedSegments
        for (let i = 0; i < activeSegments.length - 1; i++) {
            const current = activeSegments[i]
            const next = activeSegments[i + 1]
            if (current.end >= next.start) {
                return `Conflito: ${formatDate(current.start)} até ${formatDate(current.end)} x ${formatDate(next.start)}`
            }
        }
        return null
    }, [sortedSegments])

    const missingTeamError = useMemo(() => {
        if (sortedSegments.some(s => !s.equipeId)) return "Selecione a equipe para todos os períodos."
        return null
    }, [sortedSegments])

    // Notify parent of changes and validity
    useEffect(() => {
        if (onChange) onChange(sortedSegments)
    }, [sortedSegments, onChange])

    useEffect(() => {
        if (onValidationChange) {
            if (overlapError) onValidationChange(false, overlapError)
            else if (missingTeamError) onValidationChange(false, missingTeamError)
            else onValidationChange(true, null)
        }
    }, [overlapError, missingTeamError, onValidationChange])


    const handleAddSegment = (type: "EXECUCAO" | "MANUTENCAO" = "EXECUCAO") => {
        if (type === "MANUTENCAO" && !isObraFinalizada) {
            toast.error("Manutenção só pode ser agendada em obras finalizadas.")
            return
        }

        const lastSeg = sortedSegments[sortedSegments.length - 1]
        let newStart = new Date().toISOString().slice(0, 10)
        let newEnd = new Date().toISOString().slice(0, 10)

        if (lastSeg) {
            const lastEndDate = parseYMD(lastSeg.end)
            if (lastEndDate) {
                const nextStart = addDays(lastEndDate, 1)
                newStart = nextStart.toISOString().slice(0, 10)
                newEnd = nextStart.toISOString().slice(0, 10)
            }
        }

        setSegments(prev => [
            ...prev,
            {
                id: -Date.now(),
                start: newStart,
                end: newEnd,
                equipeId: lastSeg?.equipeId ?? null,
                tipo: type,
                status: "AGENDADO",
                observacoes: ""
            }
        ])
    }

    const handleChange = (id: number, field: keyof AgendaSegmentInput, value: any) => {
        setSegments(prev => prev.map(s => {
            if (s.id !== id) return s
            const updated = { ...s, [field]: value }
            // Auto-fix dates
            if (field === 'start' && updated.end < value) updated.end = value
            if (field === 'end' && updated.start > value) updated.start = value
            return updated
        }))
    }

    const handleDuplicate = (seg: AgendaSegmentInput) => {
        setSegments(prev => [
            ...prev,
            {
                ...seg,
                id: -Date.now(),
                start: seg.end,
                end: seg.end
            }
        ])
        toast.info("Período duplicado. Ajuste as datas.")
    }

    const handleRemove = (id: number) => {
        if (segments.length === 1) {
            toast.warning("A agenda deve ter pelo menos um período.")
            return
        }
        if (confirm("Remover este período?")) {
            setSegments(prev => prev.filter(s => s.id !== id))
        }
    }

    // --- Sub-components for Read-Only vs Edit ---

    const TimelineItem = ({ seg, isLast, isHistory }: { seg: AgendaSegmentInput, isLast: boolean, isHistory: boolean }) => {
        const isMaintenance = seg.tipo === "MANUTENCAO"
        const equipe = equipes.find(e => e.id === seg.equipeId)

        const start = parseYMD(seg.start)
        const end = parseYMD(seg.end)
        // const duration = start && end ? intervalToDuration({ start, end }) : null

        // Better day calc
        const diffTime = (end?.getTime() || 0) - (start?.getTime() || 0)
        const realDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

        return (
            <div className={cn("flex gap-4 relative pb-8 group", isHistory && "opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all")}>
                {/* Timeline Line */}
                {!isLast && (
                    <div className="absolute left-[19px] top-8 bottom-0 w-px bg-border/50 group-hover:bg-primary/20 transition-colors" />
                )}

                {/* Icon/Dot */}
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border shadow-sm z-10 shrink-0",
                    isMaintenance ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-card border-border text-primary"
                )}>
                    {isMaintenance ? <Wrench className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
                </div>

                {/* Content Card */}
                <div className="flex-1 bg-card border rounded-lg p-4 shadow-sm group-hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        {/* Period Info */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                <span className={cn("uppercase text-[10px] tracking-widest", isMaintenance ? "text-amber-600" : "text-primary")}>
                                    {isMaintenance ? "Manutenção" : "Execução"}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <span>{realDiffDays} {realDiffDays === 1 ? 'dia' : 'dias'}</span>
                            </div>
                            <div className="text-base font-semibold text-foreground flex items-center gap-2">
                                <span>{formatDate(seg.start)}</span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                                <span>{formatDate(seg.end)}</span>
                            </div>
                        </div>

                        {/* Team Badge */}
                        <div className="flex items-center gap-3">
                            {equipe ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-secondary/30">
                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: equipe.cor || '#ccc' }} />
                                    <span className="text-sm font-medium">{equipe.nome}</span>
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground font-normal">Sem equipe</Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const EditItem = ({ seg, index }: { seg: AgendaSegmentInput, index: number }) => {
        const isMaintenance = seg.tipo === "MANUTENCAO"
        // Status is hidden
        const isCancelled = false

        return (
            <div className={`relative flex flex-col gap-2 p-3 rounded-lg border transition-all 
                ${isMaintenance ? "bg-amber-50/50 border-amber-200" : "bg-card border-border"}
            `}>
                <div className="absolute -left-2 top-3 w-5 h-5 rounded-full bg-background border shadow-sm flex items-center justify-center text-[10px] font-bold z-10 text-muted-foreground">
                    {index + 1}
                </div>

                {/* Header: Type, Period */}
                <div className="flex items-center justify-between gap-2 pl-2">
                    <div className="flex items-center gap-2">
                        {isMaintenance ? <Wrench className="w-3.5 h-3.5 text-amber-600" /> : <Hammer className="w-3.5 h-3.5 text-primary" />}
                        <Select
                            value={seg.tipo || "EXECUCAO"}
                            onValueChange={v => handleChange(seg.id!, "tipo", v)}
                        >
                            <SelectTrigger className="h-6 text-[10px] w-auto border-none shadow-none p-0 h-auto font-semibold bg-transparent focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EXECUCAO">Execução (Obra)</SelectItem>
                                {isObraFinalizada && (
                                    <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Main Inputs */}
                <div className="grid grid-cols-12 gap-3 pl-2 mt-2">
                    {/* Dates */}
                    <div className="col-span-12 sm:col-span-7 flex flex-col gap-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Período</Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Calendar className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
                                <Input
                                    type="date"
                                    className="h-9 text-sm pl-8 pr-1 shadow-sm border-muted-foreground/20"
                                    value={seg.start}
                                    onChange={e => handleChange(seg.id!, "start", e.target.value)}
                                    disabled={isCancelled}
                                />
                            </div>
                            <span className="text-muted-foreground/50 text-[10px] font-medium">ATÉ</span>
                            <div className="relative flex-1">
                                <Calendar className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
                                <Input
                                    type="date"
                                    className="h-9 text-sm pl-8 pr-1 shadow-sm border-muted-foreground/20"
                                    value={seg.end}
                                    onChange={e => handleChange(seg.id!, "end", e.target.value)}
                                    disabled={isCancelled}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Team */}
                    <div className="col-span-12 sm:col-span-5 flex flex-col gap-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Equipe</Label>
                        <Select value={String(seg.equipeId || "")} onValueChange={v => handleChange(seg.id!, "equipeId", Number(v))} disabled={isCancelled}>
                            <SelectTrigger className="h-9 text-sm shadow-sm border-muted-foreground/20 bg-background/50">
                                <div className="flex items-center gap-2 truncate w-full">
                                    <User className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/70" />
                                    <div className="truncate flex-1 text-left">
                                        {seg.equipeId ? (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: equipes.find(e => e.id === seg.equipeId)?.cor || '#ccc' }} />
                                                <span className="truncate">{equipes.find(e => e.id === seg.equipeId)?.nome}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground opacity-70">Selecione...</span>
                                        )}
                                    </div>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {equipes.map(e => (
                                    <SelectItem key={e.id} value={String(e.id)}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.cor || '#ccc' }} />
                                            {e.nome}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-1 pt-2 border-t border-dashed mt-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1" onClick={() => handleDuplicate(seg)} title="Duplicar">
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase font-semibold tracking-wide">Duplicar</span>
                    </Button>
                    <Separator orientation="vertical" className="h-4 my-auto" />
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-destructive gap-1" onClick={() => handleRemove(seg.id!)} title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase font-semibold tracking-wide">Excluir</span>
                    </Button>
                </div>
            </div>
        )
    }

    // --- Main Render ---

    return (
        <div className="flex flex-col h-full max-h-[70vh]">

            {/* Header Stats */}
            <div className="flex items-center justify-between pb-4 flex-shrink-0">
                <div className="text-sm font-medium text-muted-foreground">
                    {readOnly ? 'Cronograma da Obra' : 'Editando Cronograma'}
                </div>

                {overlapError && (
                    <div className="flex items-center gap-1.5 text-rose-600 text-xs font-medium bg-rose-50 px-2 py-1 rounded">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Conflito Detectado</span>
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">

                {segments.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                        <Calendar className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-sm font-medium">Nenhum agendamento definido</p>
                        {!readOnly && <p className="text-xs opacity-70">Adicione um período abaixo</p>}
                    </div>
                )}

                {/* Future/Current Section */}
                {future.length > 0 && (
                    <div className={cn("space-y-4", readOnly ? "px-1" : "space-y-3 relative ml-2 pl-4 border-l-2 border-primary/10")}>
                        {/* Edit Mode Line Header */}
                        {!readOnly && <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary" />}

                        {future.map((seg, idx) => (
                            readOnly
                                ? <TimelineItem key={seg.id} seg={seg} isLast={idx === future.length - 1 && history.length === 0} isHistory={false} />
                                : <EditItem key={seg.id} seg={seg} index={idx} />
                        ))}
                    </div>
                )}

                {/* History Section */}
                {history.length > 0 && (
                    <div className={cn("space-y-4", readOnly ? "mt-8" : "mt-8 space-y-3 relative ml-2 pl-4 border-l-2 border-muted")}>

                        <div className={cn("flex items-center gap-2 mb-4", !readOnly && "absolute -left-1.5 top-0")}>
                            {!readOnly && <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />}
                            <h4 className={cn("text-xs font-bold uppercase tracking-widest text-muted-foreground", !readOnly && "ml-4")}>Histórico</h4>
                        </div>

                        {history.map((seg, idx) => (
                            readOnly
                                ? <TimelineItem key={seg.id} seg={seg} isLast={idx === history.length - 1} isHistory={true} />
                                : <EditItem key={seg.id} seg={seg} index={idx + future.length} />
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Mode Footer */}
            {!readOnly && (
                <div className="pt-4 mt-2 border-t flex flex-col sm:flex-row items-center justify-between bg-background z-20 gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => handleAddSegment(isObraFinalizada ? "EXECUCAO" : "EXECUCAO")}
                        className="gap-2 h-10 border border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Período
                    </Button>
                </div>
            )}
        </div>
    )
}
