// src/app/calendario/page.tsx
"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Toaster, toast } from "sonner"
import { AgendaEditor } from "@/components/agenda/AgendaEditor"
import { updateAgendaSegments, type AgendaSegmentInput } from "@/actions/obras/update-agenda"
import { getLastAgendaUpdate } from "@/actions/calendar-stats"
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Scissors,
  GripVertical,
  MapPin,
  User,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Wrench,
  Palette,
  LayoutGrid,
} from "lucide-react"

// FullCalendar imports
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin, { Draggable } from "@fullcalendar/interaction"
import type { EventClickArg, DateSelectArg, EventDropArg, EventContentArg } from "@fullcalendar/core"
import type { EventResizeDoneArg } from "@fullcalendar/interaction"
import ptBrLocale from "@fullcalendar/core/locales/pt-br"

// Types
type SegmentoDTO = {
  id: number
  inicio: string
  fim: string
  observacoes: string | null
  tipo: string | null
  status: string | null
  obra: {
    id: number
    titulo: string | null
    status: string
    tipoObra: string
    cliente: string | null
    clienteBairro: string | null
    clienteCidade: string | null
    clienteCidadeCor: string | null
    dataUltimaAlteracao: string | null
  }
  equipe: {
    id: number
    nome: string
    cor: string | null
  } | null
}

type KPIs = {
  faltandoAgendar: number
  agendadas: number
  emAtraso: number
}

type ObraSemAgenda = {
  id: number
  titulo: string | null
  status: string
  cliente: { nome: string } | null
  data_criacao: string | null
  data_contrato: string | null
}

type EquipeDTO = {
  id: number
  nome: string
  cor: string | null
}

// Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

async function fetchWithCache(url: string, bustCache = false): Promise<any> {
  const cached = apiCache.get(url)
  const now = Date.now()

  if (!bustCache && cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)

  const data = await res.json()
  apiCache.set(url, { data, timestamp: now })
  return data
}

// Helper for safe date math (avoiding timezone shifts)
function safeDateMath(dateStr: string, daysToAdd: number): string {
  // Ensure we operate on T12:00:00 to avoid midnight offsets
  const base = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const d = new Date(base + "T12:00:00")
  d.setDate(d.getDate() + daysToAdd)
  return d.toISOString().split("T")[0]
}

function addDay(dateStr: string): string {
  return safeDateMath(dateStr, 1)
}

function subtractDay(dateStr: string): string {
  return safeDateMath(dateStr, -1)
}

// Calculate days since a date (uses contract date if available, otherwise creation date)
function calcDaysSinceDate(dataCriacao: string | null, dataContrato: string | null): { days: number, source: 'assinatura' | 'criação' } {
  const refDate = dataContrato || dataCriacao
  if (!refDate) return { days: 0, source: 'criação' }
  const now = new Date()
  const created = new Date(refDate)
  const diffMs = now.getTime() - created.getTime()
  return {
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    source: dataContrato ? 'assinatura' : 'criação'
  }
}


export default function CalendarioPage() {
  const calendarRef = useRef<FullCalendar>(null)
  const draggableContainerRef = useRef<HTMLDivElement>(null)

  // State
  const [segmentos, setSegmentos] = useState<SegmentoDTO[]>([])
  const [kpis, setKpis] = useState<KPIs>({ faltandoAgendar: 0, agendadas: 0, emAtraso: 0 })
  const [obrasSemAgenda, setObrasSemAgenda] = useState<ObraSemAgenda[]>([])
  const [equipes, setEquipes] = useState<EquipeDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Date range for calendar view
  const [currentRange, setCurrentRange] = useState({ from: "", to: "" })

  // Filters
  const [filterEquipe, setFilterEquipe] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "manage">("create") // Simplified modes
  const [selectedSegmento, setSelectedSegmento] = useState<SegmentoDTO | null>(null)

  // Color Mode
  const [colorMode, setColorMode] = useState<"equipe" | "cidade">("equipe")
  const [cidadesLegend, setCidadesLegend] = useState<{ nome: string, cor: string }[]>([])

  // Editor state
  const [agendaForEditor, setAgendaForEditor] = useState<AgendaSegmentInput[]>([])
  const [editorObraStatus, setEditorObraStatus] = useState<string>("")
  const [isFetchingAgenda, setIsFetchingAgenda] = useState(false)

  // Save/Validation state
  const [draftAgenda, setDraftAgenda] = useState<AgendaSegmentInput[]>([])
  const [draftValid, setDraftValid] = useState(true)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [savingAgenda, setSavingAgenda] = useState(false)

  // Form state
  const [formObraId, setFormObraId] = useState<string>("")
  const [formEquipeId, setFormEquipeId] = useState<string>("NONE")
  const [formInicio, setFormInicio] = useState("")
  const [formFim, setFormFim] = useState("")
  const [formSplitDate, setFormSplitDate] = useState("")

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // User permissions
  const [canEdit] = useState(true)

  // Initialize external draggable - stable initialization
  useEffect(() => {
    if (sidebarCollapsed || !draggableContainerRef.current) {
      return
    }

    const draggable = new Draggable(draggableContainerRef.current, {
      itemSelector: ".draggable-obra",
      eventData: (eventEl) => ({
        title: eventEl.getAttribute("data-titulo") || "Nova Obra",
        duration: { days: 1 },
        extendedProps: {
          obraId: eventEl.getAttribute("data-obra-id"),
          isNew: true
        },
      }),
    })

    return () => draggable.destroy()
  }, [sidebarCollapsed]) // Only recreate when sidebar collapses/expands

  // Load equipes (cached)
  const loadEquipes = useCallback(async () => {
    try {
      const json = await fetchWithCache("/api/equipes")
      setEquipes(json.data || [])
    } catch (err) {
      console.error("Failed to load equipes:", err)
    }
  }, [])

  // Load obras sem agenda (cached)
  const loadObrasSemAgenda = useCallback(async (bustCache = false) => {
    try {
      // Use server-side filter for better performance
      const json = await fetchWithCache("/api/obras/table-search?status=!FINALIZADO&semAgenda=true&page=1&perPage=100", bustCache)
      // Sort by oldest first (data_contrato if available, else data_criacao)
      const sorted = (json.dados || []).sort((a: ObraSemAgenda, b: ObraSemAgenda) => {
        const dateA = new Date(a.data_contrato || a.data_criacao || 0).getTime()
        const dateB = new Date(b.data_contrato || b.data_criacao || 0).getTime()
        return dateA - dateB // ascending = oldest first
      })
      setObrasSemAgenda(sorted)
    } catch (err) {
      console.error("Failed to load obras:", err)
    }
  }, [])

  // Load agenda
  const loadAgenda = useCallback(async (from: string, to: string, bustCache = false) => {
    if (!from || !to) return

    try {
      setLoading(true)
      const params = new URLSearchParams({ from, to })
      if (filterEquipe && filterEquipe !== "ALL") params.append("equipe_id", filterEquipe)
      if (filterStatus && filterStatus !== "ALL") params.append("status", filterStatus)

      const url = `/api/agenda?${params}`
      const json = await fetchWithCache(url, bustCache)

      setSegmentos(json.segmentos || [])
      setKpis(json.kpis || { faltandoAgendar: 0, agendadas: 0, emAtraso: 0 })
    } catch (err) {
      toast.error("Erro ao carregar agenda")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterEquipe, filterStatus])

  // Load last update time
  const refreshLastUpdate = useCallback(async () => {
    const date = await getLastAgendaUpdate()
    if (date) setLastUpdated(date)
  }, [])

  useEffect(() => {
    refreshLastUpdate()
  }, [refreshLastUpdate])

  // Extract unique cities for legend
  useEffect(() => {
    const uniqueCidades = new Map<string, string>()
    segmentos.forEach(s => {
      if (s.obra.clienteCidade) {
        uniqueCidades.set(s.obra.clienteCidade, s.obra.clienteCidadeCor || "#6B7280")
      }
    })
    setCidadesLegend(Array.from(uniqueCidades.entries()).map(([nome, cor]) => ({ nome, cor })).sort((a, b) => a.nome.localeCompare(b.nome)))
  }, [segmentos])

  // Initial load
  useEffect(() => {
    loadEquipes()
    loadObrasSemAgenda()
  }, [loadEquipes, loadObrasSemAgenda])

  // Reload when filters change
  useEffect(() => {
    if (currentRange.from && currentRange.to) {
      loadAgenda(currentRange.from, currentRange.to, true)
    }
  }, [filterEquipe, filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAgendaModal = async () => {
    if (!formObraId) return
    if (!draftValid) {
      toast.error(draftError || "Agenda inválida")
      return
    }

    try {
      setSavingAgenda(true)
      const obId = Number(formObraId)
      const res = await updateAgendaSegments(obId, draftAgenda)

      if (res.success) {
        toast.success("Agenda salva com sucesso!")
        setModalOpen(false)
        loadAgenda(currentRange.from, currentRange.to, true)
        loadObrasSemAgenda(true)
        refreshLastUpdate()
      } else {
        toast.error(res.error || "Erro ao salvar")
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado")
    } finally {
      setSavingAgenda(false)
    }
  }

  // Convert segmentos to FullCalendar events with inclusive end dates
  const events = useMemo(() => segmentos.map((s) => ({
    id: String(s.id),
    title: s.obra.titulo || `Obra #${s.obra.id}`,
    start: s.inicio,
    end: addDay(s.fim), // FullCalendar uses exclusive end, so add 1 day

    backgroundColor: colorMode === "equipe" ? (s.equipe?.cor || "#6B7280") : (s.obra.clienteCidadeCor || "#6B7280"),
    borderColor: colorMode === "equipe" ? (s.equipe?.cor || "#6B7280") : (s.obra.clienteCidadeCor || "#6B7280"),
    extendedProps: { segmento: s },
    classNames: s.tipo === "MANUTENCAO" ? ["maintenance-event"] : [],
  })), [segmentos, colorMode])

  // Calendar handlers
  const handleDatesSet = useCallback((arg: { startStr: string; endStr: string }) => {
    const from = arg.startStr.split("T")[0]
    const to = arg.endStr.split("T")[0]

    if (from !== currentRange.from || to !== currentRange.to) {
      setCurrentRange({ from, to })
      loadAgenda(from, to)
    }
  }, [currentRange, loadAgenda])

  const handleDateSelect = (arg: DateSelectArg) => {
    if (!canEdit) {
      toast.error("Você não tem permissão para criar agendamentos")
      return
    }

    const calendarApi = calendarRef.current?.getApi()
    calendarApi?.unselect()

    const calendarApi2 = calendarRef.current?.getApi()
    calendarApi2?.unselect()

    setModalMode("create")
    setSelectedSegmento(null)
    setFormObraId("")
    setFormEquipeId("NONE")
    setEditorObraStatus("") // Reset status
    setFormInicio(arg.startStr.split("T")[0])
    // Subtract 1 day from end since FullCalendar uses exclusive end
    setFormFim(subtractDay(arg.endStr))
    setModalOpen(true)
  }

  const handleEventClick = (arg: EventClickArg) => {
    const segmento = arg.event.extendedProps.segmento as SegmentoDTO

    if (!canEdit) {
      toast.info(`${segmento.obra.titulo || "Obra"} - ${segmento.equipe?.nome || "Sem equipe"}`)
      return
    }

    setModalMode("manage")
    setSelectedSegmento(segmento)
    setFormObraId(String(segmento.obra.id))
    setEditorObraStatus(segmento.obra.status || "") // Set status from segment
    setFormEquipeId(segmento.equipe ? String(segmento.equipe.id) : "NONE")
    setFormInicio(segmento.inicio)
    setFormFim(segmento.fim)
    setModalOpen(true)
  }

  // Handle external drop (from sidebar)
  const handleEventReceive = async (info: any) => {
    const obraId = info.event.extendedProps.obraId
    const start = info.event.startStr.split("T")[0]

    // Calculate end date (subtract 1 since FullCalendar uses exclusive end)
    let end = start
    if (info.event.endStr) {
      end = subtractDay(info.event.endStr)
    }

    // Remove the temporary event
    info.event.remove()

    // Open modal to complete creation
    setModalMode("create")
    setSelectedSegmento(null)
    setFormObraId(obraId)
    setFormEquipeId("NONE")
    // Note: status will be fetched in useEffect when formObraId changes
    setFormInicio(start)
    setFormFim(end)
    setModalOpen(true)
  }

  const handleEventDrop = async (arg: EventDropArg) => {
    if (!canEdit) {
      arg.revert()
      toast.error("Você não tem permissão para reagendar")
      return
    }

    const segmento = arg.event.extendedProps.segmento as SegmentoDTO
    const newStart = arg.event.startStr.split("T")[0]

    // Calculate new end (subtract 1 from FullCalendar's exclusive end)
    let newEnd = newStart
    if (arg.event.endStr) {
      newEnd = subtractDay(arg.event.endStr)
    }

    try {
      const res = await fetch(`/api/segmentos/${segmento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inicio: newStart, fim: newEnd }),
      })

      if (!res.ok) throw new Error("Falha ao reagendar")

      const json = await res.json()
      if (json.warning) {
        toast.warning(json.warning)
      } else {
        toast.success("Reagendado!")
      }

      loadAgenda(currentRange.from, currentRange.to, true)
      refreshLastUpdate()
    } catch (err) {
      arg.revert()
      toast.error("Erro ao reagendar")
    }
  }

  const handleEventResize = async (arg: EventResizeDoneArg) => {
    if (!canEdit) {
      arg.revert()
      toast.error("Você não tem permissão para alterar")
      return
    }

    const segmento = arg.event.extendedProps.segmento as SegmentoDTO

    // Calculate new end (subtract 1 from FullCalendar's exclusive end)
    let newEnd = segmento.fim
    if (arg.event.endStr) {
      newEnd = subtractDay(arg.event.endStr)
    }

    try {
      const res = await fetch(`/api/segmentos/${segmento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fim: newEnd }),
      })

      if (!res.ok) throw new Error("Falha ao alterar")

      const json = await res.json()
      if (json.warning) {
        toast.warning(json.warning)
      } else {
        toast.success("Alterado!")
      }

      loadAgenda(currentRange.from, currentRange.to, true)
      refreshLastUpdate()
    } catch (err) {
      arg.revert()
      toast.error("Erro ao alterar")
    }
  }

  // Custom event content with tooltip and actions
  const renderEventContent = (eventInfo: EventContentArg) => {
    const segmento = eventInfo.event.extendedProps.segmento as SegmentoDTO
    if (!segmento) {
      return <div className="px-1.5 py-0.5 text-xs truncate font-medium">{eventInfo.event.title}</div>
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`px-1.5 py-0.5 text-xs truncate cursor-pointer w-full font-medium flex items-center gap-1 ${segmento.tipo === 'MANUTENCAO' ? 'italic' : ''}`}>
              {segmento.tipo === "MANUTENCAO" && <Wrench className="w-3 h-3 flex-shrink-0" />}
              {eventInfo.event.title}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="w-64 p-0 bg-card border border-border shadow-md rounded-lg overflow-hidden"
          >
            {/* Header with equipe color bar */}
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: colorMode === "equipe" ? (segmento.equipe?.cor || "#9CA3AF") : (segmento.obra.clienteCidadeCor || "#9CA3AF") }}
            />

            {/* Content */}
            <div className="p-3 space-y-2">
              <p className="font-semibold text-sm text-foreground leading-tight flex items-center gap-2">
                {segmento.tipo === "MANUTENCAO" && <Badge variant="secondary" className="h-5 px-1 text-[10px] gap-1"><Wrench className="w-3 h-3" /> Manutenção</Badge>}
                {`#${segmento.obra.id} · ${segmento.obra.titulo ?? 'Obra'}`}
              </p>

              <div className="space-y-1">
                {segmento.obra.cliente && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{segmento.obra.cliente}</span>
                  </div>
                )}
                {(segmento.obra.clienteBairro || segmento.obra.clienteCidade) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {[segmento.obra.clienteBairro, segmento.obra.clienteCidade].filter(Boolean).join(" - ")}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formatDateShort(segmento.inicio)} → {formatDateShort(segmento.fim)}</span>
                </div>
              </div>

              {segmento.equipe && (
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segmento.equipe.cor || "#9CA3AF" }}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {segmento.equipe.nome}
                  </span>
                </div>
              )}

              {segmento.obra.dataUltimaAlteracao && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">
                    Atualizado em: {new Date(segmento.obra.dataUltimaAlteracao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            {/* Action footer */}
            <div className="border-t border-border bg-muted/40 px-3 py-2">
              <Link
                href={`/obras/${segmento.obra.id}`}
                target="_blank"
                className="flex items-center justify-center gap-1.5 w-full text-xs py-1.5 px-3 rounded-md bg-background border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Abrir Obra
              </Link>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }



  // Fetch agenda wrapper - uses API to avoid Prisma in browser
  const fetchAgendaForEditor = async (idOfObra: number) => {
    try {
      setIsFetchingAgenda(true)

      const res = await fetch(`/api/obras/${idOfObra}/detalhado`)
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      const json = await res.json()
      const details = json.data

      // Set status from details
      setEditorObraStatus(details.status || "")

      const mapped: AgendaSegmentInput[] = (details?.agenda || []).map((s: any) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        tipo: s.tipo,
        status: s.status,
        equipeId: s.equipe?.id ?? null,
        observacoes: s.observacoes
      }))

      // If creating new interaction (selected via range), append a draft segment
      if (modalMode === "create" && formInicio && formFim) {
        mapped.push({
          id: -Date.now(),
          start: formInicio,
          end: formFim,
          equipeId: null,
          tipo: "EXECUCAO",
          status: "AGENDADO",
          observacoes: ""
        })
      }

      setAgendaForEditor(mapped)
    } catch (err) {
      toast.error("Erro ao carregar agenda da obra")
      console.error(err)
    } finally {
      setIsFetchingAgenda(false)
    }
  }

  // Effect to load agenda when obra is selected in modal
  useEffect(() => {
    if (!modalOpen) return
    const id = Number(formObraId)
    if (id > 0) {
      fetchAgendaForEditor(id)
    } else {
      setAgendaForEditor([])
      setEditorObraStatus("") // clear status
    }
  }, [formObraId, modalOpen]) // eslint-disable-line react-hooks/exhaustive-deps



  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "EXECUCAO": return "bg-emerald-500"
      case "A_INICIAR": return "bg-blue-500"
      case "COMPRAS": return "bg-amber-500"
      case "PENDENCIA": return "bg-rose-500"
      default: return "bg-gray-400"
    }
  }

  // Format date as "Qui (06/02)"
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00")
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const day = days[date.getDay()]
    const dd = String(date.getDate()).padStart(2, "0")
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    return `${day} (${dd}/${mm})`
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "EXECUCAO": return "Execução"
      case "A_INICIAR": return "À Iniciar"
      case "COMPRAS": return "Compras"
      case "PENDENCIA": return "Pendência"
      default: return status
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "EXECUCAO": return "border-emerald-500"
      case "A_INICIAR": return "border-blue-500"
      case "COMPRAS": return "border-amber-500"
      case "PENDENCIA": return "border-rose-500"
      default: return "border-gray-400"
    }
  }

  return (
    <PageLayout pageBackground="bg-bege-pagina">
      <Toaster position="top-right" duration={5000} closeButton richColors offset={80} />

      <div className="flex gap-4 h-[calc(100vh-120px)]">
        {/* Left Sidebar - Obras Sem Agenda */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? "w-12" : "w-72"
            }`}
        >
          <Card className="bg-card h-full flex flex-col shadow-sm">
            {/* Sidebar Header */}
            <CardHeader className={`border-b py-2 flex-shrink-0 ${sidebarCollapsed ? "px-1" : "px-3"}`}>
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Sem Agenda</CardTitle>
                    <Badge variant="outline" className="text-xs h-5">
                      {obrasSemAgenda.length}
                    </Badge>
                  </div>
                )}
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${sidebarCollapsed ? "mx-auto" : ""}`}
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      >
                        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {sidebarCollapsed ? "Expandir obras" : "Recolher"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {!sidebarCollapsed && (
                <p className="text-xs text-muted-foreground mt-1">
                  Arraste para agendar
                </p>
              )}
            </CardHeader>

            {/* Sidebar Content */}
            {sidebarCollapsed ? (
              /* Collapsed state - vertical indicator */
              <CardContent className="flex-1 flex flex-col items-center py-4 px-1">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setSidebarCollapsed(false)}>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <Badge variant="secondary" className="text-xs font-bold">
                          {obrasSemAgenda.length}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-medium writing-mode-vertical" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                          Sem Agenda
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium">{obrasSemAgenda.length} obras sem agenda</p>
                      <p className="text-xs text-muted-foreground">Clique para expandir</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            ) : (
              <CardContent className="p-2 flex-1 overflow-y-auto">
                <div ref={draggableContainerRef} className="space-y-2">
                  {obrasSemAgenda.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Todas agendadas!</p>
                    </div>
                  ) : (
                    obrasSemAgenda.map((obra) => (
                      <div
                        key={obra.id}
                        className={`draggable-obra p-3 rounded-lg border border-l-4 bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing group shadow-sm hover:shadow-md ${getStatusBorderColor(obra.status)}`}
                        data-obra-id={obra.id}
                        data-titulo={obra.titulo || `Obra #${obra.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate leading-tight">
                              {obra.titulo || `Obra #${obra.id}`}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground truncate">
                                {obra.cliente?.nome || "Sem cliente"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span className={`text-[10px] font-semibold ${calcDaysSinceDate(obra.data_criacao, obra.data_contrato).days > 7 ? 'text-red-600' : 'text-amber-600'}`}>
                                {calcDaysSinceDate(obra.data_criacao, obra.data_contrato).days} dias
                                <span className="text-[9px] font-normal opacity-70 ml-1">
                                  (desde {calcDaysSinceDate(obra.data_criacao, obra.data_contrato).source})
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 gap-3">
          {/* KPIs Row */}
          <div className="grid grid-cols-3 gap-3 flex-shrink-0">
            <Card className="bg-card shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Sem Agenda</p>
                    <p className="text-2xl font-bold text-amber-600 tabular-nums">{kpis.faltandoAgendar}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Agendadas</p>
                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">{kpis.agendadas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Em Atraso</p>
                    <p className="text-2xl font-bold text-rose-600 tabular-nums">{kpis.emAtraso}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Card */}
          <Card className="bg-card flex-1 flex flex-col min-h-0 shadow-sm">
            <CardHeader className="border-b py-2 px-4 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Calendário
                  {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </CardTitle>

                <div className="flex items-center gap-4">
                  {lastUpdated && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/50">
                      <Clock className="w-3.5 h-3.5 text-amber-600/70" />
                      <span>
                        Atualizado: <span className="font-medium text-foreground">{lastUpdated.toLocaleString('pt-BR')}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Select value={filterEquipe} onValueChange={setFilterEquipe}>
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue placeholder="Equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas equipes</SelectItem>
                        {equipes.map((eq) => (
                          <SelectItem key={eq.id} value={String(eq.id)}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: eq.cor || "#6B7280" }}
                              />
                              {eq.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos status</SelectItem>
                        <SelectItem value="EXECUCAO">Execução</SelectItem>
                        <SelectItem value="A_INICIAR">À Iniciar</SelectItem>
                        <SelectItem value="COMPRAS">Compras</SelectItem>
                        <SelectItem value="PENDENCIA">Pendência</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="bg-muted p-1 rounded-lg flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={colorMode === "equipe" ? "secondary" : "ghost"}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setColorMode("equipe")}
                            >
                              <User className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Colorir por Equipe</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={colorMode === "cidade" ? "secondary" : "ghost"}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setColorMode("cidade")}
                            >
                              <MapPin className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Colorir por Cidade</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend - Only show different items from filter */}
              {colorMode === "cidade" && cidadesLegend.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 px-1 pt-2 border-t border-border/50">
                  {cidadesLegend.map((cid) => (
                    <div key={cid.nome} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cid.cor }} />
                      <span className="text-xs text-muted-foreground">{cid.nome}</span>
                    </div>
                  ))}
                </div>
              )}
              {colorMode === "equipe" && equipes.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 px-1 pt-2 border-t border-border/50">
                  {equipes.map((eq) => (
                    <div key={eq.id} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: eq.cor || "#6B7280" }} />
                      <span className="text-xs text-muted-foreground">{eq.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-3 flex-1 overflow-hidden">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={ptBrLocale}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,dayGridWeek",
                }}
                events={events}
                editable={canEdit}
                selectable={canEdit}
                droppable={true}
                selectMirror={true}
                dayMaxEvents={3}
                datesSet={handleDatesSet}
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                eventReceive={handleEventReceive}
                eventContent={renderEventContent}
                height="100%"
                eventDisplay="block"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit/Split Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "create" && !formObraId ? "Selecionar Obra" : "Gerenciar Agenda"}
            </DialogTitle>
            <DialogDescription>
              {modalMode === "create" && !formObraId
                ? "Escolha a obra para adicionar o agendamento"
                : "Edite os trechos, adicione pausas ou altere equipes"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {/* Step 1: Select Obra (Create Mode only) */}
            {!formObraId && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Obra</Label>
                  <Select value={formObraId} onValueChange={setFormObraId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {obrasSemAgenda.map((obra) => (
                        <SelectItem key={obra.id} value={String(obra.id)}>
                          {obra.titulo || `Obra #${obra.id}`} - {obra.cliente?.nome || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  ou selecione no menu lateral
                </div>
              </div>
            )}

            {/* Step 2: Editor */}
            {formObraId && (
              <div className="mt-2">
                {isFetchingAgenda ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <AgendaEditor
                    key={formObraId} // Force remount on obra change
                    obraId={Number(formObraId)}
                    initialSegments={agendaForEditor}
                    equipes={equipes}
                    obraStatus={editorObraStatus}
                    onChange={setDraftAgenda}
                    onValidationChange={(v, e) => {
                      setDraftValid(v)
                      setDraftError(e || null)
                    }}
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            {formObraId && (
              <Button onClick={handleSaveAgendaModal} disabled={savingAgenda}>
                {savingAgenda ? "Salvando..." : "Salvar Alterações"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout >
  )
}
