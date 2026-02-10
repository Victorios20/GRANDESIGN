"use client"

import * as React from "react"
import { Trash, Edit, Loader2, UserCheck, UserPlus } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Command,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command"

type FieldIds = {
  nome: string
  telefone: string
  cidade: string
  bairro: string
  cadastrarCliente: string
}

type ClienteSearchResult = {
  id: number
  nome: string
  telefone: string | null
  bairro: string | null
  cidade_id: number | null
  cidade_nome: string | null
  cpf: string | null
}

type Props = {
  fieldIds: FieldIds

  form: { nome: string; telefone: string; cidade: string; bairro: string }
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void

  nomeBoxRef: React.RefObject<HTMLDivElement | null>
  telBoxRef: React.RefObject<HTMLDivElement | null>

  qNome: string
  setQNome: (v: string) => void
  loadingNome: boolean
  resNome: ClienteSearchResult[]
  setResNome: (v: ClienteSearchResult[]) => void

  qTel: string
  setQTel: (v: string) => void
  loadingTel: boolean
  resTel: ClienteSearchResult[]
  setResTel: (v: ClienteSearchResult[]) => void

  onPickCliente: (c: ClienteSearchResult) => void

  clearEtapa1: () => void

  clienteId: number | null
  isSavingClient: boolean
  openClienteModalCreate: () => void
  openClienteModalEdit: () => void
}

export default function DadosPessoaisCard({
  fieldIds,
  form,
  onFormChange,

  nomeBoxRef,
  telBoxRef,

  qNome,
  setQNome,
  loadingNome,
  resNome,
  setResNome,

  qTel,
  setQTel,
  loadingTel,
  resTel,
  setResTel,

  onPickCliente,

  clearEtapa1,

  clienteId,
  isSavingClient,
  openClienteModalCreate,
  openClienteModalEdit,
}: Props) {
  const showNomeDropdown = qNome.trim().length >= 2 && (loadingNome || resNome.length > 0)
  const showTelDropdown = qTel.replace(/\D/g, "").length >= 3 && (loadingTel || resTel.length > 0)

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Etapa 1
              </Badge>
              <CardTitle className="text-lg">Dados Pessoais</CardTitle>
            </div>

            <p className="text-xs text-muted-foreground">
              Para alterar cidade/bairro, use <b>Cadastrar/Editar cliente</b>.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearEtapa1}
            className="text-red-500 hover:text-red-700"
          >
            <Trash className="h-4 w-4 mr-1" /> Limpar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* NOME (pesquisa) */}
        <div ref={nomeBoxRef} className="flex flex-col gap-1 relative">
          <Label htmlFor={fieldIds.nome}>Nome</Label>
          <Input
            id={fieldIds.nome}
            name="nome"
            placeholder="Ex.: João Luiz"
            autoComplete="off"
            value={form.nome}
            onChange={(e) => {
              onFormChange(e)
              setQNome(e.target.value)
            }}
            className="h-9 border-0 bg-cinza rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"
          />

          {showNomeDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-background shadow">
              {/* evita “dupla rolagem”: scroll só aqui */}
              <div className="max-h-64 overflow-y-auto overscroll-contain">
                <Command shouldFilter={false}>
                  {/* remove scroll interno do CommandList */}
                  <CommandList className="max-h-none overflow-visible p-1">
                    {loadingNome && (
                      <CommandItem disabled className="cursor-default">
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Buscando…
                      </CommandItem>
                    )}

                    {!loadingNome && resNome.length > 0 && (
                      <CommandGroup heading="Clientes">
                        {resNome.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={String(c.id)}
                            onSelect={() => {
                              onPickCliente(c)
                              setQNome("")
                              setResNome([])
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{c.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {(c.telefone ?? "").replace(/\D/g, "").length ? c.telefone : "—"} ·{" "}
                                {c.cidade_nome ?? "Sem cidade"} {c.bairro ? `· ${c.bairro}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {!loadingNome && resNome.length === 0 && (
                      <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                    )}
                  </CommandList>
                </Command>
              </div>
            </div>
          )}
        </div>

        {/* TELEFONE (pesquisa) */}
        <div ref={telBoxRef} className="flex flex-col gap-1 relative">
          <Label htmlFor={fieldIds.telefone}>Telefone</Label>
          <Input
            id={fieldIds.telefone}
            name="telefone"
            placeholder="Ex.: (85) 98765-4321"
            autoComplete="off"
            value={form.telefone}
            onChange={(e) => {
              onFormChange(e)
              setQTel(e.target.value)
            }}
            className="h-9 border-0 bg-cinza rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none"
          />

          {showTelDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-background shadow">
              {/* evita “dupla rolagem”: scroll só aqui */}
              <div className="max-h-64 overflow-y-auto overscroll-contain">
                <Command shouldFilter={false}>
                  {/* remove scroll interno do CommandList */}
                  <CommandList className="max-h-none overflow-visible p-1">
                    {loadingTel && (
                      <CommandItem disabled className="cursor-default">
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Buscando…
                      </CommandItem>
                    )}

                    {!loadingTel && resTel.length > 0 && (
                      <CommandGroup heading="Clientes">
                        {resTel.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={String(c.id)}
                            onSelect={() => {
                              onPickCliente(c)
                              setQTel("")
                              setResTel([])
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{c.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {(c.telefone ?? "").replace(/\D/g, "").length ? c.telefone : "—"} ·{" "}
                                {c.cidade_nome ?? "Sem cidade"} {c.bairro ? `· ${c.bairro}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {!loadingTel && resTel.length === 0 && (
                      <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                    )}
                  </CommandList>
                </Command>
              </div>
            </div>
          )}
        </div>

        {/* CIDADE (somente label + texto) */}
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldIds.cidade}>Cidade</Label>
          <p
            id={fieldIds.cidade}
            className="text-sm text-marromEscuro leading-6"
            title={form.cidade?.trim() ? form.cidade : "-"}
          >
            {form.cidade?.trim() ? form.cidade : "-"}
          </p>
        </div>

        {/* BAIRRO (somente label + texto) */}
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldIds.bairro}>Bairro</Label>
          <p
            id={fieldIds.bairro}
            className="text-sm text-marromEscuro leading-6"
            title={form.bairro?.trim() ? form.bairro : "-"}
          >
            {form.bairro?.trim() ? form.bairro : "-"}
          </p>
        </div>
      </CardContent>

      <div className="p-4 pt-0 flex items-center justify-between gap-3">
        <Button
          id={fieldIds.cadastrarCliente}
          type="button"
          variant="outline"
          disabled
          className={[
            "min-w-[200px] justify-start disabled:opacity-100 disabled:cursor-default",
            clienteId
              ? "border-emerald-500 text-emerald-600 bg-white"
              : "border-red-500 text-red-600 bg-white",
          ].join(" ")}
          title={clienteId ? "Cliente associado" : "Nenhum cliente associado"}
        >
          {clienteId ? (
            <>
              <UserCheck className="h-4 w-4 mr-2 text-emerald-600" />
              <span className="text-emerald-600">Cliente associado</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2 text-red-600" />
              <span className="text-red-600">Sem cliente</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          className="min-w-[160px]"
          variant={clienteId ? "secondary" : "outline"}
          onClick={() => {
            if (clienteId) openClienteModalEdit()
            else openClienteModalCreate()
          }}
          disabled={isSavingClient}
          aria-busy={isSavingClient ? "true" : "false"}
          title={clienteId ? "Editar o cliente associado" : "Cadastrar/associar cliente"}
        >
          {isSavingClient ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Abrindo...
            </>
          ) : clienteId ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Editar cliente
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar cliente
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
