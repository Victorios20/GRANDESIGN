"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, UserPlus, Pencil, Eye } from "lucide-react"
import { toast } from "sonner"

type Cidade = { id: number; nome: string }

export type ClienteSearchResult = {
  id: number
  nome: string
  telefone: string | null
  bairro: string | null
  cidade_id: number | null
  cidade_nome: string | null
  cpf: string | null
}

type Mode = "create" | "edit" | "view"

type Prefill = {
  nome?: string
  telefone?: string
  cidade?: string
  bairro?: string
  cpf?: string | null
}

type Props = {
  open: boolean
  mode: Mode
  clienteId?: number
  prefill?: Prefill
  cidades?: Cidade[]
  onClose: () => void
  onSaved: (c: {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
    cidade_nome: string | null
    cpf?: string | null
  }) => void
}

function onlyDigits(s?: string | null) {
  const v = String(s ?? "").replace(/\D/g, "")
  return v ? v : ""
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11)
  if (!d) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

async function buscarCidades(): Promise<Cidade[]> {
  const r = await fetch("/api/cidades", { cache: "no-store" })
  if (!r.ok) throw new Error("Falha ao listar cidades")
  return r.json()
}

async function buscarClientes(by: "name" | "phone", q: string, limit = 10): Promise<ClienteSearchResult[]> {
  const url = `/api/clientes/search?by=${by}&q=${encodeURIComponent(q)}&limit=${limit}`
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) throw new Error("Falha na busca de clientes")
  return r.json()
}

async function findClienteByNomeExato(nome: string): Promise<ClienteSearchResult | null> {
  const list = await buscarClientes("name", nome, 10)
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")
  const alvo = norm(nome)
  return list.find((c) => norm(c.nome ?? "") === alvo) ?? null
}

async function criarOuAssociarCliente(
  form: { nome: string; telefone: string; bairro: string; cidade: string; cpf?: string | null },
  cidades: Cidade[]
): Promise<{ id: number; associado: boolean }> {
  const nome = form.nome.trim()
  if (!nome) throw new Error("Informe o nome do cliente.")
  const cidadeId = cidades.find((c) => c.nome === form.cidade)?.id ?? null
  const telefoneRaw = onlyDigits(form.telefone) || null
  const bairro = form.bairro?.trim() || null
  const cpf = onlyDigits(form.cpf) || null

  const r = await fetch("/api/clientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, telefone: telefoneRaw, bairro, cidade_id: cidadeId, cpf }),
  })

  if (r.status === 201) {
    const j = await r.json()
    return { id: Number(j?.id), associado: false }
  }

  if (r.status === 409) {
    const encontrado = await findClienteByNomeExato(nome)
    if (encontrado?.id) return { id: encontrado.id, associado: true }
    try {
      const j = await r.json()
      if (j?.id) return { id: Number(j.id), associado: true }
    } catch {}
    throw new Error("Cliente já existe.")
  }

  let msg = `Falha ao cadastrar cliente (${r.status})`
  try {
    const j = await r.json()
    if (j?.error) msg = j.error
  } catch {}
  throw new Error(msg)
}

async function editarCliente(
  id: number,
  form: { nome: string; telefone: string; bairro: string; cidade: string; cpf?: string | null },
  cidades: Cidade[]
): Promise<{ id: number }> {
  const nome = form.nome.trim()
  if (!nome) throw new Error("Informe o nome do cliente.")
  const cidadeId = cidades.find((c) => c.nome === form.cidade)?.id ?? null
  const telefoneRaw = onlyDigits(form.telefone) || null
  const bairro = form.bairro?.trim() || null
  const cpf = onlyDigits(form.cpf) || null

  const r = await fetch(`/api/clientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, telefone: telefoneRaw, bairro, cidade_id: cidadeId, cpf }),
  })

  if (r.status === 200) {
    const j = await r.json()
    return { id: Number(j?.id ?? id) }
  }

  if (r.status === 409) {
    let msg = "Já existe cliente com este nome."
    try {
      const j = await r.json()
      msg = j?.error || msg
    } catch {}
    throw new Error(msg)
  }

  let msg = `Falha ao atualizar cliente (${r.status})`
  try {
    const j = await r.json()
    if (j?.error) msg = j.error
  } catch {}
  throw new Error(msg)
}

async function getClienteDetalhadoById(id: number): Promise<ClienteSearchResult> {
  const r = await fetch(`/api/clientes/${id}/detalhado`, { cache: "no-store" })
  if (!r.ok) throw new Error("Falha ao carregar cliente")
  return r.json()
}

function mergePrefill(current: Prefill, prefill?: Prefill): Prefill {
  return {
    nome: prefill?.nome ?? current.nome,
    telefone: prefill?.telefone ?? current.telefone,
    cidade: prefill?.cidade ?? current.cidade,
    bairro: prefill?.bairro ?? current.bairro,
    cpf: (prefill?.cpf ?? current.cpf) ?? null,
  }
}

export default function ClienteModal({
  open,
  mode,
  clienteId,
  prefill,
  cidades: cidadesProp,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] = React.useState(false)
  const [loadingCliente, setLoadingCliente] = React.useState(false)
  const [loadingCidades, setLoadingCidades] = React.useState(false)

  const [cidades, setCidades] = React.useState<Cidade[]>(cidadesProp ?? [])

  const [nome, setNome] = React.useState("")
  const [telefone, setTelefone] = React.useState("")
  const [cidade, setCidade] = React.useState("")
  const [bairro, setBairro] = React.useState("")
  const [cpf, setCpf] = React.useState<string>("")

  const readonly = mode === "view"
  const isBusy = saving || loadingCliente || loadingCidades

  React.useEffect(() => {
    if (!open) return

    if (Array.isArray(cidadesProp) && cidadesProp.length > 0) {
      setCidades(cidadesProp)
      return
    }

    let alive = true
    setLoadingCidades(true)

    buscarCidades()
      .then((rows) => {
        if (!alive) return
        setCidades(Array.isArray(rows) ? rows : [])
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Falha ao carregar cidades"
        toast.error(msg)
        if (!alive) return
        setCidades([])
      })
      .finally(() => {
        if (!alive) return
        setLoadingCidades(false)
      })

    return () => {
      alive = false
    }
  }, [open, cidadesProp])

  React.useEffect(() => {
    if (!open) return

    const apply = (p: Prefill) => {
      setNome(p.nome ?? "")
      setTelefone(p.telefone ? formatPhone(p.telefone) : "")
      setCidade(p.cidade ?? "")
      setBairro(p.bairro ?? "")
      setCpf((p.cpf ?? "") as string)
    }

    if (mode === "create") {
      apply(mergePrefill({ nome: "", telefone: "", cidade: "", bairro: "", cpf: "" }, prefill))
      return
    }

    if (!clienteId) {
      apply(mergePrefill({ nome: "", telefone: "", cidade: "", bairro: "", cpf: "" }, prefill))
      return
    }

    let alive = true
    setLoadingCliente(true)

    getClienteDetalhadoById(clienteId)
      .then((c) => {
        if (!alive) return
        const cidadeNome =
          c.cidade_nome ??
          (c.cidade_id ? cidades.find((x) => x.id === c.cidade_id)?.nome ?? "" : "")

        const base: Prefill = {
          nome: c.nome ?? "",
          telefone: c.telefone ?? "",
          cidade: cidadeNome ?? "",
          bairro: c.bairro ?? "",
          cpf: c.cpf ?? null,
        }

        apply(mergePrefill(base, prefill))
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Falha ao carregar cliente"
        toast.error(msg)
      })
      .finally(() => {
        if (!alive) return
        setLoadingCliente(false)
      })

    return () => {
      alive = false
    }
  }, [open, mode, clienteId, prefill, cidades])

  const title =
    mode === "create" ? "Cadastrar Cliente" : mode === "edit" ? "Editar Cliente" : "Visualizar Cliente"

  const Icon = mode === "create" ? UserPlus : mode === "edit" ? Pencil : Eye

  const canConfirm =
    !readonly &&
    !!nome.trim() &&
    !!telefone.trim() &&
    !!cidade.trim() &&
    !!bairro.trim() &&
    !isBusy

  const submit = async () => {
    if (readonly || isBusy) return
    setSaving(true)

    try {
      const payload = {
        nome: nome.trim(),
        telefone: formatPhone(telefone),
        cidade: cidade.trim(),
        bairro: bairro.trim(),
        cpf: cpf?.trim() ? onlyDigits(cpf) : null,
      }

      if (mode === "create") {
        const { id, associado } = await criarOuAssociarCliente(payload, cidades)

        onSaved({
          id,
          nome: payload.nome,
          telefone: onlyDigits(payload.telefone) ? payload.telefone : null,
          bairro: payload.bairro ? payload.bairro : null,
          cidade_nome: payload.cidade || null,
          cpf: payload.cpf ?? null,
        })

        toast.success(associado ? "Cliente existente associado." : "Cliente cadastrado.")
        onClose()
        return
      }

      if (mode === "edit") {
        if (!clienteId) throw new Error("clienteId ausente para edição.")
        const { id } = await editarCliente(clienteId, payload, cidades)

        onSaved({
          id,
          nome: payload.nome,
          telefone: onlyDigits(payload.telefone) ? payload.telefone : null,
          bairro: payload.bairro ? payload.bairro : null,
          cidade_nome: payload.cidade || null,
          cpf: payload.cpf ?? null,
        })

        toast.success("Cliente atualizado.")
        onClose()
        return
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao salvar cliente"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const FieldLoadingIcon = ({ show }: { show: boolean }) => {
    if (!show) return null
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  const showSkeletonLoading = (loadingCliente && (mode === "edit" || mode === "view")) || loadingCidades

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl p-3 w-[92vw] max-w-[640px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center justify-between gap-3 text-base">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {title}
            </span>

            {showSkeletonLoading && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando dados...
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label>Nome</Label>
              <div className="relative">
                <Input
                  className="h-9 pr-9"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={readonly || isBusy}
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <FieldLoadingIcon show={showSkeletonLoading} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Telefone</Label>
              <div className="relative">
                <Input
                  className="h-9 pr-9"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  disabled={readonly || isBusy}
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <FieldLoadingIcon show={showSkeletonLoading} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label>Cidade</Label>

              <div className="relative">
                <Select
                  value={cidade || undefined}
                  onValueChange={(v) => setCidade(v)}
                  disabled={readonly || isBusy}
                >
                  <SelectTrigger className="h-9 w-full rounded-xl border-0 bg-cinza px-3 text-marromEscuro focus-visible:ring-2 focus-visible:ring-marromEscuro pr-9">
                    <SelectValue placeholder={loadingCidades ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>

                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {cidades.map((c) => (
                      <SelectItem key={c.id} value={c.nome} className="rounded-xl">
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <FieldLoadingIcon show={showSkeletonLoading} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Bairro</Label>
              <div className="relative">
                <Input
                  className="h-9 pr-9"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  disabled={readonly || isBusy}
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <FieldLoadingIcon show={showSkeletonLoading} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>CPF</Label>
            <div className="relative">
              <Input
                className="h-9 pr-9"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                disabled={readonly || isBusy}
                placeholder="Opcional"
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <FieldLoadingIcon show={showSkeletonLoading} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button className="h-9" variant="secondary" onClick={onClose} disabled={isBusy}>
            Fechar
          </Button>

          {mode !== "view" && (
            <Button className="h-9" onClick={submit} disabled={!canConfirm}>
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : mode === "create" ? (
                "Cadastrar"
              ) : (
                "Salvar"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
