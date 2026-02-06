// src/app/calendario/page.tsx
"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  obra: {
    id: number
    titulo: string | null
    status: string
    tipoObra: string
    cliente: string | null
    clienteBairro: string | null
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

// Helper: Add 1 day to date string for FullCalendar exclusive end
function addDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

export default function CalendarioPage() {
  const calendarRef = useRef<FullCalendar>(null)
  const draggableContainerRef = useRef<HTMLDivElement>(null)
  const draggableInitialized = useRef(false)

  // State
  const [segmentos, setSegmentos] = useState<SegmentoDTO[]>([])
  const [kpis, setKpis] = useState<KPIs>({ faltandoAgendar: 0, agendadas: 0, emAtraso: 0 })
  const [obrasSemAgenda, setObrasSemAgenda] = useState<ObraSemAgenda[]>([])
  const [equipes, setEquipes] = useState<EquipeDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Date range for calendar view
  const [currentRange, setCurrentRange] = useState({ from: "", to: "" })

  // Filters
  const [filterEquipe, setFilterEquipe] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "split">("create")
  const [selectedSegmento, setSelectedSegmento] = useState<SegmentoDTO | null>(null)

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

  // Initialize external draggable
  useEffect(() => {
    if (draggableContainerRef.current && !draggableInitialized.current && obrasSemAgenda.length > 0) {
      draggableInitialized.current = true
      new Draggable(draggableContainerRef.current, {
        itemSelector: ".draggable-obra",
        eventData: (eventEl) => {
          const obraId = eventEl.getAttribute("data-obra-id")
          const titulo = eventEl.getAttribute("data-titulo")
          return {
            title: titulo || "Nova Obra",
            duration: { days: 7 },
            extendedProps: { obraId, isNew: true },
          }
        },
      })
    }
  }, [obrasSemAgenda])

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
      const json = await fetchWithCache("/api/obras/table-search?status=!FINALIZADO&page=1&perPage=100", bustCache)
      const obras = (json.dados || []).filter((o: any) => !o._count?.segmentos || o._count.segmentos === 0)
      setObrasSemAgenda(obras)
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

  // Convert segmentos to FullCalendar events with inclusive end dates
  const events = useMemo(() => segmentos.map((s) => ({
    id: String(s.id),
    title: s.obra.titulo || `Obra #${s.obra.id}`,
    start: s.inicio,
    end: addDay(s.fim), // FullCalendar uses exclusive end, so add 1 day
    backgroundColor: s.equipe?.cor || "#6B7280",
    borderColor: s.equipe?.cor || "#6B7280",
    extendedProps: { segmento: s },
  })), [segmentos])

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

    setModalMode("create")
    setSelectedSegmento(null)
    setFormObraId("")
    setFormEquipeId("NONE")
    setFormInicio(arg.startStr.split("T")[0])
    // Subtract 1 day from end since FullCalendar uses exclusive end
    const endDate = new Date(arg.endStr)
    endDate.setDate(endDate.getDate() - 1)
    setFormFim(endDate.toISOString().split("T")[0])
    setModalOpen(true)
  }

  const handleEventClick = (arg: EventClickArg) => {
    const segmento = arg.event.extendedProps.segmento as SegmentoDTO

    if (!canEdit) {
      toast.info(`${segmento.obra.titulo || "Obra"} - ${segmento.equipe?.nome || "Sem equipe"}`)
      return
    }

    setModalMode("edit")
    setSelectedSegmento(segmento)
    setFormObraId(String(segmento.obra.id))
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
      const endDate = new Date(info.event.endStr)
      endDate.setDate(endDate.getDate() - 1)
      end = endDate.toISOString().split("T")[0]
    }

    // Remove the temporary event
    info.event.remove()

    // Open modal to complete creation
    setModalMode("create")
    setSelectedSegmento(null)
    setFormObraId(obraId)
    setFormEquipeId("NONE")
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
      const endDate = new Date(arg.event.endStr)
      endDate.setDate(endDate.getDate() - 1)
      newEnd = endDate.toISOString().split("T")[0]
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
      const endDate = new Date(arg.event.endStr)
      endDate.setDate(endDate.getDate() - 1)
      newEnd = endDate.toISOString().split("T")[0]
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
    } catch (err) {
      arg.revert()
      toast.error("Erro ao alterar")
    }
  }

  // Custom event content with tooltip
  const renderEventContent = (eventInfo: EventContentArg) => {
    const segmento = eventInfo.event.extendedProps.segmento as SegmentoDTO
    if (!segmento) {
      return <div className="px-1.5 py-0.5 text-xs truncate font-medium">{eventInfo.event.title}</div>
    }

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="px-1.5 py-0.5 text-xs truncate cursor-pointer w-full font-medium">
              {eventInfo.event.title}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-popover border shadow-lg">
            <div className="space-y-1.5 p-1">
              <p className="font-semibold text-sm">{segmento.obra.titulo || `Obra #${segmento.obra.id}`}</p>
              {segmento.obra.cliente && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3 h-3" /> {segmento.obra.cliente}
                </p>
              )}
              {segmento.obra.clienteBairro && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {segmento.obra.clienteBairro}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1 border-t">
                <p className="text-xs font-medium">
                  {segmento.inicio} → {segmento.fim}
                </p>
              </div>
              {segmento.equipe && (
                <Badge
                  variant="secondary"
                  className="text-xs text-white"
                  style={{ backgroundColor: segmento.equipe.cor || "#6B7280" }}
                >
                  {segmento.equipe.nome}
                </Badge>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Form handlers
  const handleSubmit = async () => {
    try {
      setProcessing(true)

      if (modalMode === "create") {
        if (!formObraId) {
          toast.error("Selecione uma obra")
          return
        }

        const res = await fetch(`/api/obras/${formObraId}/segmentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipe_id: (formEquipeId && formEquipeId !== "NONE") ? formEquipeId : null,
            inicio: formInicio,
            fim: formFim,
          }),
        })

        if (!res.ok) throw new Error("Falha ao criar segmento")

        const json = await res.json()
        if (json.warning) toast.warning(json.warning)
        toast.success("Agendamento criado!")
      } else if (modalMode === "edit" && selectedSegmento) {
        const res = await fetch(`/api/segmentos/${selectedSegmento.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipe_id: (formEquipeId && formEquipeId !== "NONE") ? formEquipeId : null,
            inicio: formInicio,
            fim: formFim,
          }),
        })

        if (!res.ok) throw new Error("Falha ao atualizar segmento")

        const json = await res.json()
        if (json.warning) toast.warning(json.warning)
        toast.success("Agendamento atualizado!")
      } else if (modalMode === "split" && selectedSegmento) {
        const res = await fetch(`/api/segmentos/${selectedSegmento.id}/split`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ splitDate: formSplitDate }),
        })

        if (!res.ok) throw new Error("Falha ao dividir segmento")
        toast.success("Segmento dividido!")
      }

      setModalOpen(false)
      loadAgenda(currentRange.from, currentRange.to, true)
      loadObrasSemAgenda(true)
    } catch (err) {
      toast.error("Erro ao salvar")
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSegmento) return

    try {
      setProcessing(true)
      const res = await fetch(`/api/segmentos/${selectedSegmento.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir")

      toast.success("Agendamento excluído!")
      setModalOpen(false)
      loadAgenda(currentRange.from, currentRange.to, true)
      loadObrasSemAgenda(true)
    } catch (err) {
      toast.error("Erro ao excluir")
    } finally {
      setProcessing(false)
    }
  }

  const openSplitModal = () => {
    if (!selectedSegmento) return
    setModalMode("split")
    setFormSplitDate("")
  }

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "EXECUCAO": return "Execução"
      case "A_INICIAR": return "À Iniciar"
      case "COMPRAS": return "Compras"
      case "PENDENCIA": return "Pendência"
      default: return status
    }
  }

  return (
    <PageLayout pageBackground="bg-bege-pagina">
      <Toaster richColors position="top-right" />

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
                        className="draggable-obra p-2.5 rounded-lg border bg-background hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all group hover:shadow-sm"
                        data-obra-id={obra.id}
                        data-titulo={obra.titulo || `Obra #${obra.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate leading-tight">
                              {obra.titulo || `Obra #${obra.id}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {obra.cliente?.nome || "Sem cliente"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(obra.status)}`} />
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {getStatusLabel(obra.status)}
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
                    <p className="text-xs text-muted-foreground font-medium">Sem Agenda</p>
                    <p className="text-xl font-bold text-amber-600">{kpis.faltandoAgendar}</p>
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
                    <p className="text-xs text-muted-foreground font-medium">Agendadas</p>
                    <p className="text-xl font-bold text-emerald-600">{kpis.agendadas}</p>
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
                    <p className="text-xs text-muted-foreground font-medium">Em Atraso</p>
                    <p className="text-xl font-bold text-rose-600">{kpis.emAtraso}</p>
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
                </div>
              </div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "create" && "Novo Agendamento"}
              {modalMode === "edit" && "Editar Agendamento"}
              {modalMode === "split" && "Dividir Segmento"}
            </DialogTitle>
            <DialogDescription>
              {modalMode === "split"
                ? "Escolha a data para dividir o segmento em dois"
                : "Preencha as informações do agendamento"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {modalMode !== "split" && (
              <>
                {/* Obra select - only for create */}
                {modalMode === "create" && (
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
                )}

                {/* Show obra info when editing */}
                {modalMode === "edit" && selectedSegmento && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">{selectedSegmento.obra.titulo || `Obra #${selectedSegmento.obra.id}`}</p>
                    <p className="text-xs text-muted-foreground">{selectedSegmento.obra.cliente || "Sem cliente"}</p>
                  </div>
                )}

                {/* Equipe select */}
                <div className="space-y-2">
                  <Label>Equipe</Label>
                  <Select value={formEquipeId} onValueChange={setFormEquipeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma equipe (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sem equipe</SelectItem>
                      {equipes.map((eq) => (
                        <SelectItem key={eq.id} value={String(eq.id)}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: eq.cor || "#6B7280" }}
                            />
                            {eq.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inicio">Início</Label>
                    <Input
                      id="inicio"
                      type="date"
                      value={formInicio}
                      onChange={(e) => setFormInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fim">Fim</Label>
                    <Input
                      id="fim"
                      type="date"
                      value={formFim}
                      onChange={(e) => setFormFim(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {modalMode === "split" && selectedSegmento && (
              <div className="space-y-2">
                <Label htmlFor="splitDate">Data de Divisão</Label>
                <Input
                  id="splitDate"
                  type="date"
                  value={formSplitDate}
                  onChange={(e) => setFormSplitDate(e.target.value)}
                  min={selectedSegmento.inicio}
                  max={selectedSegmento.fim}
                />
                <p className="text-xs text-muted-foreground">
                  Segmento atual: {selectedSegmento.inicio} até {selectedSegmento.fim}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {modalMode === "edit" && (
              <>
                <Button
                  variant="outline"
                  onClick={openSplitModal}
                  disabled={processing}
                  className="gap-2"
                >
                  <Scissors className="w-4 h-4" />
                  Dividir
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={processing}
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={processing}
              className="bg-marromEscuro text-bege hover:bg-marromEscuro/90"
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {modalMode === "split" ? "Dividir" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
