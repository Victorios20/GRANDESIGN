"use client"

import { format } from "date-fns"
import { Mail, RefreshCw, Search, User2, UserPlus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  operationalListControlClass,
  operationalListGhostButtonClass,
  operationalListPrimaryButtonClass,
  operationalListSearchInputClass,
  operationalListShellClass,
  operationalListTableHeadCellClass,
  operationalListTableHeadClass,
  operationalListTableHeadRowClass,
  operationalListTableRowClass,
} from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"
import UserCreateCard from "./user-create-card"

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
  const [pageBusy, setPageBusy] = useState(false)
  const [busyUserId, setBusyUserId] = useState<number | null>(null)
  const [openCreateTop, setOpenCreateTop] = useState(false)

  useEffect(() => {
    setRows(initialUsers)
  }, [initialUsers])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) {
      return rows
    }

    return rows.filter((row) =>
      [row.email, row.name].some((value) => String(value ?? "").toLowerCase().includes(needle))
    )
  }, [q, rows])

  function copy(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copiado!"))
      .catch(() => toast.error("Falha ao copiar."))
  }

  async function handleToggleActive(user: UserRow, value: boolean) {
    setPageBusy(true)
    setBusyUserId(user.id)
    const prev = user.is_active

    setRows((current) => current.map((row) => (row.id === user.id ? { ...row, is_active: value } : row)))

    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: value }),
      })

      if (!response.ok) {
        throw new Error()
      }

      toast.success("Status atualizado.")
    } catch {
      setRows((current) => current.map((row) => (row.id === user.id ? { ...row, is_active: prev } : row)))
      toast.error("Falha ao atualizar status.")
    } finally {
      setBusyUserId(null)
      setPageBusy(false)
    }
  }

  async function handleChangeRole(user: UserRow, newRole: string) {
    const current = user.roles[0] || ""
    if (newRole === current) {
      return
    }

    setPageBusy(true)
    setBusyUserId(user.id)

    setRows((rowsState) =>
      rowsState.map((row) => (row.id === user.id ? { ...row, roles: newRole ? [newRole] : [] } : row))
    )

    try {
      const response = await fetch(`/api/admin/users/${user.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: newRole ? [newRole] : [] }),
      })

      if (!response.ok) {
        throw new Error()
      }

      toast.success("Role atualizada.")
    } catch {
      setRows((rowsState) =>
        rowsState.map((row) => (row.id === user.id ? { ...row, roles: current ? [current] : [] } : row))
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
      <Select value={current} onValueChange={(value) => handleChangeRole(user, value)} disabled={pageBusy}>
        <SelectTrigger className={cn(operationalListControlClass, "h-9 w-[220px]")}>
          <SelectValue placeholder="Selecionar role" />
        </SelectTrigger>
        <SelectContent>
          {allRoles.map((role) => (
            <SelectItem key={role.id} value={role.name}>
              <div className="flex w-full items-center justify-between gap-3">
                <span className="text-[#2c201b]">{role.label}</span>
                <span className="text-xs text-[#7b705f]">{role.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className={cn("space-y-4", pageBusy && "pointer-events-none opacity-90")} aria-busy={pageBusy}>
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">Usuários</h1>
          <p className="text-sm text-[#6f6556]">
            {filtered.length} usuário{filtered.length === 1 ? "" : "s"} na visualização atual
          </p>
        </div>

        <Dialog open={openCreateTop} onOpenChange={setOpenCreateTop}>
          <DialogTrigger asChild>
            <Button className={cn(operationalListPrimaryButtonClass, "h-10 rounded-lg px-4 text-sm")} disabled={pageBusy}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="w-auto border-none bg-transparent p-0 shadow-none sm:max-w-[28rem]">
            <DialogHeader className="hidden">
              <DialogTitle />
              <DialogDescription />
            </DialogHeader>
            <UserCreateCard allRoles={allRoles} onCreated={() => setOpenCreateTop(false)} />
          </DialogContent>
        </Dialog>
      </section>

      <section className={cn(operationalListShellClass, "space-y-3 px-4 py-4 md:px-5")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7d69]" />
            <Input
              placeholder="Buscar por e-mail ou nome"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className={operationalListSearchInputClass}
              disabled={pageBusy}
            />
          </div>

          {q ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setQ("")}
              className={cn("px-3 text-sm", operationalListGhostButtonClass)}
              disabled={pageBusy}
            >
              <X className="mr-1 size-4" />
              Limpar busca
            </Button>
          ) : null}
        </div>
      </section>

      <section className={cn(operationalListShellClass)} aria-busy={pageBusy}>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className={operationalListTableHeadClass}>
              <TableRow className={operationalListTableHeadRowClass}>
                <TableHead className={cn(operationalListTableHeadCellClass, "whitespace-nowrap")}>E-mail</TableHead>
                <TableHead className={cn(operationalListTableHeadCellClass, "whitespace-nowrap")}>Nome</TableHead>
                <TableHead className={cn(operationalListTableHeadCellClass, "whitespace-nowrap")}>Função (role)</TableHead>
                <TableHead className={cn(operationalListTableHeadCellClass, "whitespace-nowrap text-center")}>Ativo</TableHead>
                <TableHead className={cn(operationalListTableHeadCellClass, "whitespace-nowrap")}>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const createdAt = format(new Date(user.created_at), "dd/MM/yyyy HH:mm")
                const rowBusy = busyUserId === user.id

                return (
                  <TableRow key={user.id} className={cn(operationalListTableRowClass, rowBusy && "opacity-70")}>
                    <TableCell className="max-w-[240px] px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#7b705f]" />
                        <button
                          className="truncate font-medium text-[#2c201b] hover:underline"
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
                        <User2 className="h-4 w-4 text-[#7b705f]" />
                        <span className="truncate text-[#2c201b]">{user.name || "-"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4">
                      <RoleSelect user={user} />
                    </TableCell>

                    <TableCell className="px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(value) => handleToggleActive(user, !!value)}
                          disabled={pageBusy}
                          aria-busy={rowBusy}
                        />
                        {rowBusy ? <RefreshCw className="h-4 w-4 animate-spin text-[#7b705f]" /> : null}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap px-4 text-[#2c201b]/80">
                      {createdAt}
                    </TableCell>
                  </TableRow>
                )
              })}

              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-12 text-center text-[#7b705f]">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
