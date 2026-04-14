"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { toast, Toaster } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  operationalListControlClass,
  operationalListPrimaryButtonClass,
  operationalListShellClass,
} from "@/components/ui/operational-list-styles"

type RoleItem = {
  id: number
  name: "ADMIN" | "DEV" | "VENDEDOR" | "VISITANTE" | (string & {})
  label: string
}

type Props = {
  allRoles: RoleItem[]
  onCreated?: () => void
}

export default function UserCreateCard({ allRoles, onCreated }: Props) {
  const router = useRouter()

  const defaultRole = useMemo(() => {
    const preferred = allRoles.find((role) => role.name === "VISITANTE")
    return preferred?.name ?? allRoles[0]?.name ?? ""
  }, [allRoles])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>(defaultRole)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [showPwdConf, setShowPwdConf] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrMsg(null)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName || !trimmedEmail || !password || !confirm) {
      setErrMsg("Preencha todos os campos.")
      toast.error("Preencha todos os campos.")
      return
    }

    if (password !== confirm) {
      setErrMsg("As senhas não conferem.")
      toast.error("As senhas não conferem.")
      return
    }

    if (password.length < 8) {
      setErrMsg("A senha deve ter pelo menos 8 caracteres.")
      toast.error("A senha deve ter pelo menos 8 caracteres.")
      return
    }

    if (!role) {
      setErrMsg("Selecione uma role.")
      toast.error("Selecione uma role.")
      return
    }

    setBusy(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password, role }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          (response.status === 401 && "Cadastro público está bloqueado. Verifique suas permissões.") ||
          (response.status === 409 && "Já existe uma conta com este e-mail.") ||
          (response.status === 422 && (data?.error || "Role informada é inválida.")) ||
          (response.status === 400 && (data?.error || "Dados inválidos. Corrija e tente novamente.")) ||
          data?.error ||
          "Não foi possível criar o usuário."

        setErrMsg(message)
        toast.error(message)
        return
      }

      const createdId: number | null = data?.id ?? data?.user?.id ?? null
      const applied = (data?.role_aplicada as string | null) ?? null

      if (createdId && (!applied || applied !== role)) {
        const roleResponse = await fetch(`/api/admin/users/${createdId}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: [role] }),
        })

        if (!roleResponse.ok) {
          toast.warning("Usuário criado, mas não foi possível aplicar a role automaticamente.")
        }
      }

      toast.success(`Usuário cadastrado${role ? ` como ${role}` : ""}.`)
      setName("")
      setEmail("")
      setPassword("")
      setConfirm("")
      setRole(defaultRole)
      router.refresh()
      onCreated?.()
    } catch {
      setErrMsg("Falha ao cadastrar usuário.")
      toast.error("Falha ao cadastrar usuário.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={cn(operationalListShellClass, "mx-auto w-full max-w-md overflow-hidden")}>
      <Toaster richColors position="top-right" />
      <CardHeader className="space-y-2">
        <CardTitle className="text-balance text-2xl font-bold text-[#2c201b]">Cadastrar novo usuário</CardTitle>
        <CardDescription className="text-pretty text-base text-[#6f6556]">
          Crie usuários internos e defina a permissão no ato do cadastro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome completo"
              className={cn(operationalListControlClass, "h-11")}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className={cn(operationalListControlClass, "h-11")}
              autoComplete="email"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole} disabled={busy}>
              <SelectTrigger className={cn(operationalListControlClass, "h-11")}>
                <SelectValue placeholder="Selecionar role" />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-[#2c201b]">{item.label}</span>
                      <span className="text-xs text-[#7b705f]">{item.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className={cn(operationalListControlClass, "h-11 pr-10")}
                autoComplete="new-password"
                disabled={busy}
              />
              <button
                type="button"
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPwd}
                onClick={() => setShowPwd((value) => !value)}
                className="absolute inset-y-0 right-2 flex items-center justify-center rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showPwdConf ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="••••••••"
                className={cn(operationalListControlClass, "h-11 pr-10")}
                autoComplete="new-password"
                disabled={busy}
              />
              <button
                type="button"
                aria-label={showPwdConf ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPwdConf}
                onClick={() => setShowPwdConf((value) => !value)}
                className="absolute inset-y-0 right-2 flex items-center justify-center rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {showPwdConf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {errMsg ? <p className="text-sm text-red-600">{errMsg}</p> : null}

          <Button type="submit" className={cn(operationalListPrimaryButtonClass, "h-11 w-full text-base font-medium")} disabled={busy}>
            {busy ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-xs leading-relaxed text-[#6f6556]">
          O usuário será criado e terá a role selecionada aplicada automaticamente (se você for ADMIN).
        </p>
      </CardFooter>
    </Card>
  )
}
