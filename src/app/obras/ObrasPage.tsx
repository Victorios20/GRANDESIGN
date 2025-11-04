"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Pencil, X } from "lucide-react"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"

import InfosGerais from "./_sections/InfosGerais"
import type { ObraInfosVM, CreateObraPayload, UpdateObraPayload } from "./lib/types"
import { createObra, updateObra } from "./lib/api"

type Option = { value: string; label: string }

type Props = {
  mode: "new" | "view"
  obraId?: number
  orcamentoId?: number
  initial: Partial<ObraInfosVM>
  tiposObraOptions: Option[]
  telhaOptions: Option[]
}

function hydrate(initial: Partial<ObraInfosVM>): ObraInfosVM {
  return {
    titulo: initial.titulo ?? undefined,
    tipoObra: initial.tipoObra ?? "",
    largura: initial.largura ?? 0,
    comprimento: initial.comprimento ?? 0,
    telhaEscolhida: initial.telhaEscolhida ?? "",
    status: (initial.status as any) ?? "Assinatura de contrato",
    cliente: {
      nome: initial.cliente?.nome ?? "",
      telefone: initial.cliente?.telefone ?? "",
      cpf: initial.cliente?.cpf ?? "",
      bairro: initial.cliente?.bairro ?? "",
      cidade: initial.cliente?.cidade ?? "",
    },
    endereco: {
      logradouro: initial.endereco?.logradouro ?? "",
      bairro: initial.endereco?.bairro ?? "",
      cidade: initial.endereco?.cidade ?? "",
      mapsUrl: initial.endereco?.mapsUrl ?? "",
    },
    observacoes: initial.observacoes ?? null,
  }
}

export default function ObrasPage({
  mode,
  obraId,
  orcamentoId,
  initial,
  tiposObraOptions,
  telhaOptions,
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(mode === "new")
  const [saving, setSaving] = useState(false)
  const [vm, setVm] = useState<ObraInfosVM>(() => hydrate(initial))

  const patch = (p: Partial<ObraInfosVM>) => setVm((d) => ({ ...d, ...p }))

  const tituloTopo = useMemo(() => {
    const base = vm?.cliente?.nome?.trim() ? vm.cliente.nome.split(" ")[0] : vm.titulo || "Obra"
    const cidade = vm?.endereco?.cidade ? ` [${vm.endereco.cidade}]` : ""
    return `${base}${cidade}`
  }, [vm])

  async function onSave() {
    try {
      setSaving(true)

      if (mode === "new") {
        if (!orcamentoId) {
          toast.error("Orçamento não informado.")
          return
        }
        const payload: CreateObraPayload = {
          orcamentoId: Number(orcamentoId),
          endereco_obra: vm.endereco.logradouro,
          maps_url: vm.endereco.mapsUrl,
          tipo_obra: vm.tipoObra || "",
          largura: vm.largura ?? 0,
          comprimento: vm.comprimento ?? 0,
          telha_escolhida: vm.telhaEscolhida || "",
          valor_obra: 0,
          valor_mao_de_obra: 0,
          observacoes: vm.observacoes ?? null,
          actorUserId: 0,
          clienteCpf: vm.cliente?.cpf ?? null,
        }
        const r = await createObra(payload)
        toast.success("Obra criada.")
        router.push(`/obras/${r.obraId}`)
      } else if (obraId) {
        const upd: UpdateObraPayload = {
          obra: {
            endereco_obra: vm.endereco.logradouro,
            maps_url: vm.endereco.mapsUrl,
            tipo_obra: vm.tipoObra || "",
            largura: vm.largura ?? 0,
            comprimento: vm.comprimento ?? 0,
            telha_escolhida: vm.telhaEscolhida || "",
            status: vm.status,
            observacoes: vm.observacoes ?? undefined,
          },
        }
        await updateObra(obraId, upd)
        toast.success("Obra atualizada.")
        setIsEditing(false)
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  function onCancel() {
    setVm(hydrate(initial))
    setIsEditing(false)
  }

  return (
    <PageLayout
      links={[
        { label: "Home", href: "/" },
        { label: "Obras", href: "/obras" },
      ]}
      title={tituloTopo}
      headerActions={
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              size="sm"
              className="h-8 min-w-[110px] bg-bege text-marromEscuro hover:bg-bege/80"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" className="h-8 min-w-[110px]" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-8 min-w-[110px] bg-green text-white hover:bg-bege/90"
                onClick={onSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </>
          )}
        </div>
      }
    >
      <InfosGerais
        value={vm}
        onChange={patch}
        isEditing={isEditing}
        tiposObraOptions={tiposObraOptions}
        telhaOptions={telhaOptions}
      />
    </PageLayout>
  )
}
