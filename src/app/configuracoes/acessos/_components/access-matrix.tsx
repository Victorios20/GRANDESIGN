"use client"

import { Info, Search, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  operationalListControlClass,
  operationalListPrimaryButtonClass,
  operationalListSearchInputClass,
  operationalListShellClass,
  operationalListTableHeadCellClass,
  operationalListTableHeadClass,
  operationalListTableHeadRowClass,
  operationalListTableRowClass,
} from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"
import { getEffectiveModules, type ModuleGroup, type RoleModuleMap } from "@/lib/access/modules"

type CatalogItem = { key: string; label: string; group: ModuleGroup }
type RoleItem = { id: number; name: string; label: string; isAdmin: boolean; moduleKeys: string[] }
type Override = { moduleKey: string; effect: "ALLOW" | "DENY" }
type UserItem = { id: number; name: string; email: string; roles: string[]; overrides: Override[] }

type Props = {
  catalog: CatalogItem[]
  initialRoles: RoleItem[]
  initialUsers: UserItem[]
}

const GROUP_LABELS: Record<ModuleGroup, string> = {
  operacional: "Operacional",
  financeiro: "Financeiro",
  admin: "Administração",
}

type OverrideChoice = "INHERIT" | "ALLOW" | "DENY"

export default function AccessMatrix({ catalog, initialRoles, initialUsers }: Props) {
  // Apenas módulos não-administrativos são configuráveis aqui.
  // Páginas de administração (/admin/users, /configuracoes) seguem restritas a ADMIN/DEV.
  const modules = useMemo(() => catalog.filter((m) => m.group !== "admin"), [catalog])
  const editableRoles = useMemo(() => initialRoles.filter((r) => !r.isAdmin), [initialRoles])

  // Estado: módulos concedidos por papel (apenas papéis editáveis).
  const [roleGrants, setRoleGrants] = useState<Record<string, Set<string>>>(() => {
    const next: Record<string, Set<string>> = {}
    for (const role of editableRoles) next[role.name] = new Set(role.moduleKeys)
    return next
  })
  const [busy, setBusy] = useState(false)

  const roleGrantsMap = useMemo<RoleModuleMap>(() => {
    const map: RoleModuleMap = {}
    for (const [roleName, set] of Object.entries(roleGrants)) map[roleName] = [...set]
    return map
  }, [roleGrants])

  async function handleToggleRoleModule(roleName: string, moduleKey: string, checked: boolean) {
    const prev = roleGrants[roleName] ?? new Set<string>()
    const next = new Set(prev)
    if (checked) next.add(moduleKey)
    else next.delete(moduleKey)

    setBusy(true)
    setRoleGrants((state) => ({ ...state, [roleName]: next }))

    try {
      const response = await fetch(`/api/admin/access/roles/${encodeURIComponent(roleName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKeys: [...next] }),
      })
      if (!response.ok) throw new Error()
      toast.success("Acesso do papel atualizado.")
    } catch {
      setRoleGrants((state) => ({ ...state, [roleName]: prev }))
      toast.error("Falha ao atualizar o acesso.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-2xl border border-[#e8e1d6] bg-[#fbf9f4] px-4 py-3 text-sm text-[#6f6556]">
        <Info className="mt-0.5 size-4 shrink-0 text-[#8a7d69]" />
        <p>
          As alterações passam a valer para cada usuário no próximo login. ADMIN e DEV têm acesso
          total e não aparecem aqui.
        </p>
      </div>

      <Tabs defaultValue="papel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="papel">Por papel</TabsTrigger>
          <TabsTrigger value="usuario">Por usuário</TabsTrigger>
        </TabsList>

        <TabsContent value="papel">
          <RoleMatrix
            modules={modules}
            editableRoles={editableRoles}
            roleGrants={roleGrants}
            busy={busy}
            onToggle={handleToggleRoleModule}
          />
        </TabsContent>

        <TabsContent value="usuario">
          <UserOverrides modules={modules} users={initialUsers} roleGrantsMap={roleGrantsMap} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RoleMatrix({
  modules,
  editableRoles,
  roleGrants,
  busy,
  onToggle,
}: {
  modules: CatalogItem[]
  editableRoles: RoleItem[]
  roleGrants: Record<string, Set<string>>
  busy: boolean
  onToggle: (roleName: string, moduleKey: string, checked: boolean) => void
}) {
  return (
    <section className={cn(operationalListShellClass, "overflow-x-auto")} aria-busy={busy}>
      <Table className="w-full">
        <TableHeader className={operationalListTableHeadClass}>
          <TableRow className={operationalListTableHeadRowClass}>
            <TableHead className={cn(operationalListTableHeadCellClass, "sticky left-0 z-10 min-w-[200px] bg-[#faf8f3]")}>Módulo</TableHead>
            {editableRoles.map((role) => (
              <TableHead key={role.id} className={cn(operationalListTableHeadCellClass, "text-center")}>
                {role.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((module) => (
            <TableRow key={module.key} className={operationalListTableRowClass}>
              <TableCell className="sticky left-0 z-10 bg-white px-4">
                <div className="flex flex-col">
                  <span className="font-medium text-[#2c201b]">{module.label}</span>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[#9a8f7c]">
                    {GROUP_LABELS[module.group]}
                  </span>
                </div>
              </TableCell>
              {editableRoles.map((role) => (
                <TableCell key={role.id} className="px-4 text-center">
                  <div className="flex items-center justify-center">
                    <Switch
                      checked={roleGrants[role.name]?.has(module.key) ?? false}
                      onCheckedChange={(value) => onToggle(role.name, module.key, !!value)}
                      disabled={busy}
                    />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function UserOverrides({
  modules,
  users,
  roleGrantsMap,
}: {
  modules: CatalogItem[]
  users: UserItem[]
  roleGrantsMap: RoleModuleMap
}) {
  const [q, setQ] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [choices, setChoices] = useState<Record<string, OverrideChoice>>({})
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return users
    return users.filter((u) => [u.email, u.name].some((v) => String(v ?? "").toLowerCase().includes(needle)))
  }, [q, users])

  const selected = useMemo(() => users.find((u) => u.id === selectedId) ?? null, [users, selectedId])

  // Acesso herdado dos papéis (sem overrides), para mostrar a base.
  const inherited = useMemo(() => {
    if (!selected) return new Set<string>()
    return getEffectiveModules(selected.roles, roleGrantsMap, [])
  }, [selected, roleGrantsMap])

  function selectUser(user: UserItem) {
    setSelectedId(user.id)
    const initial: Record<string, OverrideChoice> = {}
    for (const o of user.overrides) initial[o.moduleKey] = o.effect
    setChoices(initial)
  }

  const effective = useMemo(() => {
    if (!selected) return new Set<string>()
    const overrides: Override[] = Object.entries(choices)
      .filter(([, c]) => c !== "INHERIT")
      .map(([moduleKey, c]) => ({ moduleKey, effect: c as "ALLOW" | "DENY" }))
    return getEffectiveModules(selected.roles, roleGrantsMap, overrides)
  }, [selected, choices, roleGrantsMap])

  async function handleSave() {
    if (!selected) return
    const overrides: Override[] = Object.entries(choices)
      .filter(([, c]) => c !== "INHERIT")
      .map(([moduleKey, c]) => ({ moduleKey, effect: c as "ALLOW" | "DENY" }))

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/access/users/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      })
      if (!response.ok) throw new Error()
      toast.success("Exceções salvas.")
    } catch {
      toast.error("Falha ao salvar as exceções.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className={cn(operationalListShellClass, "flex flex-col gap-3 p-3")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7d69]" />
          <Input
            placeholder="Buscar usuário"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={operationalListSearchInputClass}
          />
        </div>
        <div className="max-h-[420px] space-y-1 overflow-y-auto">
          {filtered.map((user) => (
            <button
              key={user.id}
              onClick={() => selectUser(user)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#f4efe4]",
                selectedId === user.id && "bg-[#f6f2e7]"
              )}
            >
              <p className="truncate text-sm font-medium text-[#2c201b]">{user.name || user.email}</p>
              <p className="truncate text-xs text-[#7b705f]">{user.email}</p>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#7b705f]">Nenhum usuário encontrado.</p>
          ) : null}
        </div>
      </section>

      <section className={cn(operationalListShellClass, "p-4")}>
        {!selected ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-[#7b705f]">
            Selecione um usuário para ajustar exceções.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[#2c201b]">{selected.name || selected.email}</p>
                <p className="text-xs text-[#7b705f]">
                  Papéis: {selected.roles.length ? selected.roles.join(", ") : "—"}
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className={cn(operationalListPrimaryButtonClass, "h-9 rounded-lg px-4 text-sm")}
              >
                <ShieldCheck className="mr-2 size-4" />
                Salvar exceções
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#ece6db]">
              <Table className="w-full">
                <TableHeader className={operationalListTableHeadClass}>
                  <TableRow className={operationalListTableHeadRowClass}>
                    <TableHead className={operationalListTableHeadCellClass}>Módulo</TableHead>
                    <TableHead className={cn(operationalListTableHeadCellClass, "text-center")}>Herdado</TableHead>
                    <TableHead className={cn(operationalListTableHeadCellClass, "w-[200px]")}>Exceção</TableHead>
                    <TableHead className={cn(operationalListTableHeadCellClass, "text-center")}>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => {
                    const choice = choices[module.key] ?? "INHERIT"
                    const inheritedHas = inherited.has(module.key)
                    const effectiveHas = effective.has(module.key)
                    return (
                      <TableRow key={module.key} className={operationalListTableRowClass}>
                        <TableCell className="px-4 font-medium text-[#2c201b]">{module.label}</TableCell>
                        <TableCell className="px-4 text-center text-sm text-[#7b705f]">
                          {inheritedHas ? "Sim" : "Não"}
                        </TableCell>
                        <TableCell className="px-4">
                          <Select
                            value={choice}
                            onValueChange={(value) =>
                              setChoices((s) => ({ ...s, [module.key]: value as OverrideChoice }))
                            }
                          >
                            <SelectTrigger className={cn(operationalListControlClass, "h-9 w-full")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INHERIT">Herdado</SelectItem>
                              <SelectItem value="ALLOW">Permitir</SelectItem>
                              <SelectItem value="DENY">Negar</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-4 text-center">
                          <span
                            className={cn(
                              "inline-flex h-6 items-center rounded-md px-2 text-[11px] font-medium",
                              effectiveHas
                                ? "bg-[#e7f0e3] text-[#2f6b34]"
                                : "bg-[#f3e7e2] text-[#8a3a28]"
                            )}
                          >
                            {effectiveHas ? "Tem acesso" : "Sem acesso"}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
