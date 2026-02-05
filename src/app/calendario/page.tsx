"use client"

import React from "react"

import { useState, useRef } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardTopbar } from "@/components/dashboard-topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
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
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  Phone,
  ExternalLink,
  Users,
  Filter,
  GripVertical,
} from "lucide-react"
import Link from "next/link"

// Types
interface Obra {
  id: number
  cliente: string
  telefone: string
  endereco: string
  bairro: string
  cidade: string
  tipo: "Telhado" | "Reforma" | "Construção"
  equipe: string
  status: "agendado" | "em_andamento" | "concluido" | "cancelado"
  dias: string[] // Array de datas no formato "YYYY-MM-DD" - dias que a obra acontece
  linkMaps?: string
  observacoes?: string
  cor: string // Cor da barra
}

// Mock Data - Obras com múltiplos dias (não necessariamente consecutivos)
const obrasData: Obra[] = [
  {
    id: 1,
    cliente: "Maria Silva",
    telefone: "(85) 99999-1234",
    endereco: "Rua Governador Elsio, 76",
    bairro: "Ancuri",
    cidade: "Itaitinga",
    tipo: "Telhado",
    equipe: "Josiel",
    status: "concluido",
    dias: ["2026-01-05", "2026-01-06", "2026-01-07"],
    linkMaps: "https://maps.google.com",
    cor: "#f5d193",
  },
  {
    id: 2,
    cliente: "João Santos",
    telefone: "(85) 98888-5678",
    endereco: "Av. Principal, 150",
    bairro: "Centro",
    cidade: "Fortaleza",
    tipo: "Reforma",
    equipe: "Pedro",
    status: "concluido",
    dias: ["2026-01-08", "2026-01-09", "2026-01-12", "2026-01-13"], // Pula fim de semana
    cor: "#393316",
  },
  {
    id: 3,
    cliente: "Ana Costa",
    telefone: "(85) 97777-9012",
    endereco: "Rua das Flores, 45",
    bairro: "Messejana",
    cidade: "Fortaleza",
    tipo: "Construção",
    equipe: "Carlos",
    status: "em_andamento",
    dias: ["2026-01-19", "2026-01-20", "2026-01-21", "2026-01-22", "2026-01-23"],
    cor: "#2c201b",
  },
  {
    id: 4,
    cliente: "Roberto Lima",
    telefone: "(85) 96666-3456",
    endereco: "Rua do Sol, 89",
    bairro: "Aldeota",
    cidade: "Fortaleza",
    tipo: "Telhado",
    equipe: "Josiel",
    status: "agendado",
    dias: ["2026-01-26", "2026-01-27", "2026-01-28", "2026-01-30", "2026-01-31"], // Pula dia 29
    linkMaps: "https://maps.google.com",
    cor: "#d4a84b",
  },
  {
    id: 5,
    cliente: "Fernanda Oliveira",
    telefone: "(85) 95555-7890",
    endereco: "Av. Santos Dumont, 500",
    bairro: "Fátima",
    cidade: "Fortaleza",
    tipo: "Reforma",
    equipe: "Pedro",
    status: "agendado",
    dias: ["2026-01-26", "2026-01-27"],
    cor: "#6b5c4d",
  },
  {
    id: 6,
    cliente: "Carlos Mendes",
    telefone: "(85) 94444-1234",
    endereco: "Rua Padre Cícero, 200",
    bairro: "Bom Jardim",
    cidade: "Fortaleza",
    tipo: "Telhado",
    equipe: "Carlos",
    status: "agendado",
    dias: ["2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05"],
    cor: "#8b7355",
  },
  {
    id: 7,
    cliente: "Paula Ferreira",
    telefone: "(85) 93333-5678",
    endereco: "Rua José Bastos, 80",
    bairro: "Centro",
    cidade: "Maracanaú",
    tipo: "Construção",
    equipe: "Josiel",
    status: "agendado",
    dias: ["2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-13", "2026-02-16", "2026-02-17"],
    observacoes: "Cliente pediu para ligar antes de ir",
    cor: "#5c4a3d",
  },
]

// Equipes disponíveis
const equipes = ["Todas", "Josiel", "Pedro", "Carlos"]

// Tipos de obra
const tiposObra = ["Todos", "Telhado", "Reforma", "Construção"]

function getStatusLabel(status: string) {
  switch (status) {
    case "agendado":
      return "Agendado"
    case "em_andamento":
      return "Em andamento"
    case "concluido":
      return "Concluído"
    case "cancelado":
      return "Cancelado"
    default:
      return status
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "agendado":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "em_andamento":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "concluido":
      return "bg-green-100 text-green-800 border-green-200"
    case "cancelado":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1))
  const [obras, setObras] = useState<Obra[]>(obrasData)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [filtroEquipe, setFiltroEquipe] = useState("Todas")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [draggedObra, setDraggedObra] = useState<Obra | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days: (number | null)[] = []

    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const parseDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number)
    return { year, month: month - 1, day }
  }

  const getFilteredObras = () => {
    return obras.filter((obra) => {
      if (filtroEquipe !== "Todas" && obra.equipe !== filtroEquipe) return false
      if (filtroTipo !== "Todos" && obra.tipo !== filtroTipo) return false
      return true
    })
  }

  const getObrasForDay = (day: number) => {
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)
    return getFilteredObras().filter((obra) => obra.dias.includes(dateKey))
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date(2026, 0, 1))
  }

  const days = getDaysInMonth(currentDate)

  const isToday = (day: number) => {
    return day === 26 && currentDate.getMonth() === 0 && currentDate.getFullYear() === 2026
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, obra: Obra, dayIndex: number) => {
    setDraggedObra(obra)
    const obraFirstDayInMonth = obra.dias.find((d) => {
      const { month, year } = parseDateKey(d)
      return month === currentDate.getMonth() && year === currentDate.getFullYear()
    })
    if (obraFirstDayInMonth) {
      const { day } = parseDateKey(obraFirstDayInMonth)
      setDragOffset(dayIndex - day)
    }
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetDay: number) => {
    e.preventDefault()
    if (!draggedObra) return

    const targetDateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), targetDay)
    
    // Calcular diferença de dias
    const firstDayOfObra = draggedObra.dias[0]
    const { year: firstYear, month: firstMonth, day: firstDay } = parseDateKey(firstDayOfObra)
    const firstDate = new Date(firstYear, firstMonth, firstDay)
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay)
    const diffDays = Math.round((targetDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))

    // Atualizar todos os dias da obra
    const newDias = draggedObra.dias.map((dia) => {
      const { year, month, day } = parseDateKey(dia)
      const oldDate = new Date(year, month, day)
      const newDate = new Date(oldDate.getTime() + diffDays * 24 * 60 * 60 * 1000)
      return formatDateKey(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
    })

    setObras((prev) =>
      prev.map((o) => (o.id === draggedObra.id ? { ...o, dias: newDias } : o))
    )

    setDraggedObra(null)
    setDragOffset(0)
  }

  // Estatísticas do mês
  const allObrasMonth = getFilteredObras().filter((obra) =>
    obra.dias.some((dia) => {
      const { year, month } = parseDateKey(dia)
      return year === currentDate.getFullYear() && month === currentDate.getMonth()
    })
  )

  const totalObras = allObrasMonth.length
  const obrasAgendadas = allObrasMonth.filter((o) => o.status === "agendado").length
  const obrasEmAndamento = allObrasMonth.filter((o) => o.status === "em_andamento").length
  const obrasConcluidas = allObrasMonth.filter((o) => o.status === "concluido").length

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-64">
        <DashboardTopbar title="Calendário de Obras" showNewButton={true} newButtonLabel="Nova Obra" />
        <main className="p-8">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-foreground">{totalObras}</p>
                  <p className="text-sm text-muted-foreground">Total no mes</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-blue-600">{obrasAgendadas}</p>
                  <p className="text-sm text-muted-foreground">Agendadas</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-amber-600">{obrasEmAndamento}</p>
                  <p className="text-sm text-muted-foreground">Em andamento</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-green-600">{obrasConcluidas}</p>
                  <p className="text-sm text-muted-foreground">Concluidas</p>
                </CardContent>
              </Card>
            </div>

            {/* Calendar */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <CardTitle className="text-xl font-semibold min-w-48 text-center">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </CardTitle>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Hoje
                    </Button>
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtrar:</span>
                  </div>
                  <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
                    <SelectTrigger className="w-36">
                      <Users className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipes.map((equipe) => (
                        <SelectItem key={equipe} value={equipe}>
                          {equipe}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposObra.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day names */}
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2 border-b border-border">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {days.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="min-h-28 border-r border-b border-border bg-muted/30" />
                    }

                    const obrasDoDay = getObrasForDay(day)

                    return (
                      <div
                        key={day}
                        className={`
                          min-h-28 border-r border-b border-border p-1 transition-colors
                          ${isToday(day) ? "bg-primary/5" : "bg-card hover:bg-muted/30"}
                        `}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`
                              text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                              ${isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"}
                            `}
                          >
                            {day}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {obrasDoDay.map((obra) => {
                            const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)
                            const isFirstDay = obra.dias[0] === dateKey || 
                              !obra.dias.some((d) => {
                                const { day: dDay, month, year } = parseDateKey(d)
                                return month === currentDate.getMonth() && 
                                       year === currentDate.getFullYear() && 
                                       dDay < day
                              })
                            
                            const isLastDay = obra.dias[obra.dias.length - 1] === dateKey ||
                              !obra.dias.some((d) => {
                                const { day: dDay, month, year } = parseDateKey(d)
                                return month === currentDate.getMonth() && 
                                       year === currentDate.getFullYear() && 
                                       dDay > day
                              })

                            const prevDay = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day - 1)
                            const nextDay = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day + 1)
                            const hasPrevDay = obra.dias.includes(prevDay)
                            const hasNextDay = obra.dias.includes(nextDay)

                            return (
                              <div
                                key={obra.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, obra, day)}
                                onClick={() => setSelectedObra(obra)}
                                className={`
                                  group relative px-2 py-1.5 cursor-grab active:cursor-grabbing
                                  text-xs font-medium text-white truncate
                                  hover:brightness-110 transition-all
                                  ${isFirstDay && !hasPrevDay ? "rounded-l-md ml-0" : "-ml-1 pl-3"}
                                  ${isLastDay && !hasNextDay ? "rounded-r-md mr-0" : "-mr-1 pr-3"}
                                  ${draggedObra?.id === obra.id ? "opacity-50" : ""}
                                `}
                                style={{ 
                                  backgroundColor: obra.cor,
                                  color: obra.cor === "#f5d193" || obra.cor === "#d4a84b" ? "#2c201b" : "#FAF3E0"
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  {isFirstDay && !hasPrevDay && (
                                    <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-70 flex-shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {isFirstDay ? obra.cliente : ""}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Arraste as obras para reagendar</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal de detalhes da obra */}
      <Dialog open={!!selectedObra} onOpenChange={() => setSelectedObra(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedObra?.cor }}
              />
              {selectedObra?.cliente}
            </DialogTitle>
          </DialogHeader>
          {selectedObra && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(selectedObra.status)}>
                  {getStatusLabel(selectedObra.status)}
                </Badge>
                <Badge variant="secondary">{selectedObra.tipo}</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{selectedObra.cliente}</p>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{selectedObra.telefone}</p>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{selectedObra.endereco}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedObra.bairro}, {selectedObra.cidade}
                    </p>
                    {selectedObra.linkMaps && (
                      <Link
                        href={selectedObra.linkMaps}
                        target="_blank"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver no Google Maps
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{selectedObra.equipe}</p>
                    <p className="text-xs text-muted-foreground">Equipe responsavel</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Dias agendados:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedObra.dias.map((dia) => {
                      const date = new Date(dia + "T12:00:00")
                      return (
                        <Badge key={dia} variant="outline" className="text-xs">
                          {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {selectedObra.observacoes && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Observacoes:</p>
                    <p className="text-sm">{selectedObra.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setSelectedObra(null)}>
                  Fechar
                </Button>
                <Link href={`/obras/${selectedObra.id}`} className="flex-1">
                  <Button className="w-full">Ver obra</Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
