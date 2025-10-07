"use client"

// Client Component (UI + interações)
// Caminho: src/app/admin/users/_componentes/users-table.tsx
import * as React from "react"
import { useMemo, useState, useEffect } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Mail, User2, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type UserRow = {
  id: number
  name: string
  email: string
  is_active: boolean
  roles: string[]
  created_at: string
}

type RoleItem = {
  id: number
  name: "ADMIN" | "DEV" | "VENDEDOR" | "VISITANTE" | (string & {})
  label: string
}

type Props = {
  initialUsers: UserRow[]
  allRoles: RoleItem[]
}

export default function UsersTable({ initialUsers, allRoles }: Props) {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<UserRow[]>(initialUsers)

  // trava global de UI durante qualquer request
  const [pageBusy, setPageBusy] = useState(false)
  const [busyUserId, setBusyUserId] = useState<number | null>(null)

  useEffect(() => {
    setRows(initialUsers)
  }, [initialUsers])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) =>
      [r.email, r.name].some((v) => String(v || "").toLowerCase().includes(needle))
    )
  }, [q, rows])

  function copy(text: string) {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copiado!"))
      .catch(() => toast.error("Falha ao copiar."))
  }

  async function handleToggleActive(user: UserRow, value: boolean) {
    setPageBusy(true)
    setBusyUserId(user.id)
    const prev = user.is_active

    // otimista
    setRows((old) => old.map((r) => (r.id === user.id ? { ...r, is_active: value } : r)))
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: value }),
      })
      if (!res.ok) throw new Error()
      toast.success("Status atualizado.")
    } catch {
      // reverte
      setRows((old) => old.map((r) => (r.id === user.id ? { ...r, is_active: prev } : r)))
      toast.error("Falha ao atualizar status.")
    } finally {
      setBusyUserId(null)
      setPageBusy(false)
    }
  }

  async function handleChangeRole(user: UserRow, newRole: string) {
    const current = user.roles[0] || ""
    if (newRole === current) return

    setPageBusy(true)
    setBusyUserId(user.id)

    // otimista: aplica role única
    setRows((old) =>
      old.map((r) => (r.id === user.id ? { ...r, roles: newRole ? [newRole] : [] } : r))
    )

    try {
      const res = await fetch(`/api/admin/users/${user.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: newRole ? [newRole] : [] }),
      })
      if (!res.ok) throw new Error()
      toast.success("Role atualizada.")
    } catch {
      // reverte
      setRows((old) =>
        old.map((r) => (r.id === user.id ? { ...r, roles: current ? [current] : [] } : r))
      )
      toast.error("Falha ao atualizar role.")
    } finally {
      setBusyUserId(null)
      setPageBusy(false)
    }
  }

  function RoleSelect({ user }: { user: UserRow }) {
    const current = user.roles[0] || ""

    return (
      <Select
        value={current}
        onValueChange={(val) => handleChangeRole(user, val)}
        disabled={pageBusy}
      >
        <SelectTrigger className="h-9 w-[220px] border-marromClaro text-marromEscuro">
          <SelectValue placeholder="Selecionar role" />
        </SelectTrigger>
        <SelectContent>
          {allRoles.map((role) => (
            <SelectItem key={role.id} value={role.name}>
              <div className="flex items-center justify-between w-full gap-3">
                <span className="text-marromEscuro">{role.label}</span>
                <span className="text-xs text-marromClaro">{role.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className={cn("mx-auto w-full space-y-4", pageBusy && "pointer-events-none opacity-90")} aria-busy={pageBusy}>
      {/* CARD 1 — Cabeçalho da área (max-width reduzido) */}
      <header className="mx-auto w-full max-w-[1500px] bg-bege-header shadow-header border border-marromClaro/40 rounded-xl px-4 sm:px-6 py-4">
        <h1 className="text-2xl font-bold text-marromEscuro">Usuários</h1>
        <p className="text-sm text-marromClaro">Gerencie permissões e status de acesso do sistema.</p>
      </header>


      {/* CARD 2 — Lista + Filtro + Tabela no MESMO card (mesmo max-width do card acima) */}
      <Card className="mx-auto w-full max-w-[1500px] border-marromClaro/40">
        <CardHeader className="pb-3">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-marromEscuro">Lista de usuários</CardTitle>
              <CardDescription className="text-marromClaro">
                E-mail, nome, permissão (role única) e status de acesso.
              </CardDescription>
            </div>
            <div className="w-56">
              <Input
                placeholder="Buscar por e-mail ou nome…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 border-marromClaro"
                disabled={pageBusy}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* wrapper com bordas arredondadas e borda externa para a tabela */}
          <div className="m-4 rounded-lg border border-marromClaro/40 overflow-hidden">
            <Table>
              <TableCaption className="text-marromClaro px-4">
                Gerencie o acesso dos usuários.
              </TableCaption>
              <TableHeader>
                <TableRow className="bg-bege">
                  <TableHead className="text-marromEscuro whitespace-nowrap px-4">E-mail</TableHead>
                  <TableHead className="text-marromEscuro whitespace-nowrap px-4">Nome</TableHead>
                  <TableHead className="text-marromEscuro whitespace-nowrap px-4">Função (role)</TableHead>
                  <TableHead className="text-marromEscuro whitespace-nowrap text-center px-4">Ativo</TableHead>
                  <TableHead className="text-marromEscuro whitespace-nowrap px-4">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const createdAt = format(new Date(user.created_at), "dd/MM/yyyy HH:mm")
                  const rowBusy = busyUserId === user.id
                  return (
                    <TableRow key={user.id} className={cn("hover:bg-marromClaro/20", rowBusy && "opacity-70")}>
                      <TableCell className="max-w-[240px] px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-marromClaro" />
                          <button
                            className="text-marromEscuro font-medium hover:underline truncate"
                            title="Clique para copiar"
                            onClick={() => copy(user.email)}
                            disabled={pageBusy}
                          >
                            {user.email}
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[200px] px-4">
                        <div className="flex items-center gap-2">
                          <User2 className="h-4 w-4 text-marromClaro" />
                          <span className="text-marromEscuro truncate">{user.name || "-"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4">
                        <RoleSelect user={user} />
                      </TableCell>

                      <TableCell className="text-center px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={(val) => handleToggleActive(user, !!val)}
                            disabled={pageBusy}
                            aria-busy={rowBusy}
                          />
                          {rowBusy && <RefreshCw className="h-4 w-4 animate-spin text-marromClaro" />}
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-marromEscuro/80 px-4">
                        {createdAt}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="py-10 text-center text-marromClaro">
                        Nenhum usuário encontrado.
                        <div className="mt-3">
                          <Button variant="outline" onClick={() => setQ("")} disabled={pageBusy}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Limpar filtros
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
