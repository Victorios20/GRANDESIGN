"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import type { ElementType } from "react"
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  File,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  ScrollText,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import {
  excluirDocumento,
  listarDocumentos,
  reordenarDocumentos,
} from "@/actions/obras/documentos"
import {
  obterTitulosLinksObra,
  atualizarLinkObra,
} from "@/actions/obras/atualizar-links-obra"
import {
  DEFAULT_FIXED_LINK_LABELS,
  normalizeFixedLinkTitle,
  type LinkKey,
} from "@/actions/obras/links-fixos"
import {
  ObraDocumento,
  TipoDocumento,
  TIPO_DOCUMENTO_LABELS,
} from "@/actions/obras/documentos-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import DocumentoUploadModal from "./DocumentoUploadModal"

type Mode = "new" | "view" | "edit"

type Props = {
  mode: Mode
  obraId: number
  orcamentoLink?: string | null
  orcamentoId?: number | null
  propostaLink?: string | null
  contratoLink?: string | null
  ordemServicoId?: number | null
  ordemServicoLink?: string | null
  className?: string
}

type LinkFieldProps = {
  label: string
  value?: string | null
  icon: ElementType
  onDelete?: () => void
  onEdit?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  showEditDelete?: boolean
}

type FixedLinkLabels = Record<LinkKey, string>

const TIPO_ICONS: Record<TipoDocumento, ElementType> = {
  CONTRATO_ASSINADO: FileSignature,
  RECIBO: Receipt,
  TERMO: ScrollText,
  OUTROS: File,
}

function LinkField({
  label,
  value,
  icon: Icon,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  showEditDelete,
}: LinkFieldProps) {
  const href = (value ?? "").trim()
  const hasValue = href.length > 0

  return (
    <div className="w-full flex items-center gap-2 min-w-0 py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green/10">
        <Icon className="h-4 w-4 text-green" />
      </div>

      <div className="flex-1 min-w-0">
        <Label className="font-medium text-black text-sm">{label}</Label>
      </div>

      {hasValue ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-green text-sm cursor-pointer hover:underline shrink-0"
        >
          Abrir
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span className="text-black/40 text-sm shrink-0">NÃ£o vinculado</span>
      )}

      {showEditDelete && (
        <div className="flex items-center gap-0.5 ml-1">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded transition-colors"
              title="Mover para cima"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded transition-colors"
              title="Mover para baixo"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 text-black/40 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Anexos({
  mode,
  obraId,
  orcamentoLink,
  orcamentoId,
  propostaLink,
  contratoLink,
  ordemServicoId,
  ordemServicoLink,
  className,
}: Props) {
  const router = useRouter()
  const [documentos, setDocumentos] = useState<ObraDocumento[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<ObraDocumento | null>(null)
  const [, startTransition] = useTransition()
  const [fixedEditKey, setFixedEditKey] = useState<LinkKey | null>(null)
  const [fixedEditUrl, setFixedEditUrl] = useState("")
  const [fixedEditLabel, setFixedEditLabel] = useState("")
  const [fixedTitles, setFixedTitles] = useState<FixedLinkLabels>(
    DEFAULT_FIXED_LINK_LABELS
  )

  const baseOrcamentoUrl = useMemo(() => {
    if (orcamentoLink && orcamentoLink.trim()) return orcamentoLink.trim()
    if (!orcamentoId) return ""
    return `/orcamento/detalhes/${orcamentoId}`
  }, [orcamentoId, orcamentoLink])

  const [localOrcamento, setLocalOrcamento] = useState(baseOrcamentoUrl)
  const [localContrato, setLocalContrato] = useState(contratoLink ?? "")
  const [localProposta, setLocalProposta] = useState(propostaLink ?? "")
  const [localOrdemServico, setLocalOrdemServico] = useState(ordemServicoLink ?? "")

  useEffect(() => {
    setLocalOrcamento(baseOrcamentoUrl)
  }, [baseOrcamentoUrl])

  useEffect(() => {
    setLocalContrato(contratoLink ?? "")
  }, [contratoLink])

  useEffect(() => {
    setLocalProposta(propostaLink ?? "")
  }, [propostaLink])

  useEffect(() => {
    setLocalOrdemServico(ordemServicoLink ?? "")
  }, [ordemServicoLink])

  const orcamentoUrl = useMemo(() => {
    const base = localOrcamento.trim()
    if (base) return base
    return baseOrcamentoUrl
  }, [baseOrcamentoUrl, localOrcamento])

  const ordemServicoUrl = useMemo(() => {
    const base = localOrdemServico.trim()
    if (base) return base
    if (!ordemServicoId) return ""
    return `/ordemServico/${ordemServicoId}`
  }, [localOrdemServico, ordemServicoId])

  const showExtra = mode !== "new"
  const isEditable = mode !== "new"

  const loadDocumentos = useCallback(async () => {
    if (!obraId || mode === "new") return

    try {
      const [docs, titles] = await Promise.all([
        listarDocumentos(obraId),
        obterTitulosLinksObra(obraId),
      ])

      docs.sort(
        (a, b) =>
          (a.ordem ?? Number.MAX_SAFE_INTEGER) -
          (b.ordem ?? Number.MAX_SAFE_INTEGER)
      )

      setDocumentos(docs)
      setFixedTitles({
        contrato: titles.contrato ?? DEFAULT_FIXED_LINK_LABELS.contrato,
        proposta: titles.proposta ?? DEFAULT_FIXED_LINK_LABELS.proposta,
        ordemServico:
          titles.ordemServico ?? DEFAULT_FIXED_LINK_LABELS.ordemServico,
        orcamento: titles.orcamento ?? DEFAULT_FIXED_LINK_LABELS.orcamento,
      })
      router.refresh()
    } catch (error) {
      console.error("Erro ao carregar documentos:", error)
    }
  }, [mode, obraId, router])

  useEffect(() => {
    loadDocumentos()
  }, [loadDocumentos])

  function handleDelete(docId: number) {
    startTransition(async () => {
      const result = await excluirDocumento(docId)
      if (result.success) {
        toast.success("Documento excluÃ­do")
        setDocumentos((prev) => prev.filter((doc) => doc.id !== docId))
      } else {
        toast.error(result.error || "Erro ao excluir")
      }
    })
  }

  function handleEditClick(doc: ObraDocumento) {
    setEditDoc(doc)
    setModalOpen(true)
  }

  function handleMove(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === documentos.length - 1) return

    const newDocs = [...documentos]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    const temp = newDocs[index]

    newDocs[index] = newDocs[swapIndex]
    newDocs[swapIndex] = temp

    setDocumentos(newDocs)

    startTransition(async () => {
      const updates = newDocs.map((doc, position) => ({
        id: doc.id,
        ordem: position,
      }))
      const result = await reordenarDocumentos(updates)

      if (!result.success) {
        toast.error("Erro ao reordenar")
        loadDocumentos()
      }
    })
  }

  function openFixedEdit(key: LinkKey, label: string, currentUrl: string) {
    setFixedEditKey(key)
    setFixedEditLabel(label)
    setFixedEditUrl(currentUrl)
    setEditDoc(null)
    setModalOpen(true)
  }

  async function handleFixedEditSave(
    key: LinkKey,
    url: string,
    titulo: string | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!obraId) {
      return { success: false, error: "Obra ID nÃ£o encontrado" }
    }

    const result = await atualizarLinkObra(obraId, key, url || null, titulo)

    if (result.success) {
      const nextTitle =
        normalizeFixedLinkTitle(key, titulo) ?? DEFAULT_FIXED_LINK_LABELS[key]

      if (key === "orcamento") setLocalOrcamento(url)
      if (key === "contrato") setLocalContrato(url)
      if (key === "proposta") setLocalProposta(url)
      if (key === "ordemServico") setLocalOrdemServico(url)

      setFixedTitles((prev) => ({ ...prev, [key]: nextTitle }))
      setFixedEditKey(null)
      router.refresh()
    }

    return result
  }

  const fixedCount = [
    orcamentoUrl,
    localContrato,
    localProposta,
    ordemServicoUrl,
  ].filter((value) => value?.trim()).length
  const totalCount = fixedCount + documentos.length

  return (
    <>
      <Card className={`w-full rounded-2xl border-0 shadow-sm bg-white ${className ?? ""}`}>
        <CardHeader className="px-6 pt-6 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green text-xl">
            <Paperclip className="h-5 w-5" />
            Anexos
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? "item" : "itens"}
            </span>
            {showExtra && (
              <Button
                size="sm"
                variant="ghost-green"
                onClick={() => {
                  setEditDoc(null)
                  setModalOpen(true)
                }}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-3">
          <div className="w-full flex flex-col gap-2">
            <LinkField
              label={fixedTitles.orcamento}
              value={orcamentoUrl}
              icon={FileText}
              showEditDelete={showExtra}
              onEdit={() =>
                openFixedEdit("orcamento", fixedTitles.orcamento, orcamentoUrl)
              }
            />

            <LinkField
              label={fixedTitles.contrato}
              value={showExtra ? localContrato : ""}
              icon={FileSignature}
              showEditDelete={showExtra}
              onEdit={() =>
                openFixedEdit("contrato", fixedTitles.contrato, localContrato)
              }
            />

            <LinkField
              label={fixedTitles.proposta}
              value={localProposta}
              icon={FileSpreadsheet}
              showEditDelete={showExtra}
              onEdit={() =>
                openFixedEdit("proposta", fixedTitles.proposta, localProposta)
              }
            />

            <LinkField
              label={fixedTitles.ordemServico}
              value={showExtra ? ordemServicoUrl : ""}
              icon={FileText}
              showEditDelete={showExtra}
              onEdit={() =>
                openFixedEdit(
                  "ordemServico",
                  fixedTitles.ordemServico,
                  localOrdemServico
                )
              }
            />

            {documentos.map((doc, index) => {
              const Icon = TIPO_ICONS[doc.tipo] || File
              const docUrl = doc.url || doc.link || ""
              const label = doc.titulo || TIPO_DOCUMENTO_LABELS[doc.tipo]

              return (
                <LinkField
                  key={doc.id}
                  label={label}
                  value={docUrl}
                  icon={Icon}
                  showEditDelete={isEditable}
                  onDelete={() => handleDelete(doc.id)}
                  onEdit={() => handleEditClick(doc)}
                  onMoveUp={index > 0 ? () => handleMove(index, "up") : undefined}
                  onMoveDown={
                    index < documentos.length - 1
                      ? () => handleMove(index, "down")
                      : undefined
                  }
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      <DocumentoUploadModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setEditDoc(null)
            setFixedEditKey(null)
          }
        }}
        obraId={obraId}
        onSuccess={loadDocumentos}
        documento={editDoc}
        fixedLinkKey={fixedEditKey}
        fixedLinkLabel={fixedEditLabel}
        fixedLinkUrl={fixedEditUrl}
        onFixedLinkSave={handleFixedEditSave}
      />
    </>
  )
}
