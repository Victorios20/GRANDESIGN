"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import type { ElementType } from "react"
import {
  Paperclip,
  ExternalLink,
  FileText,
  FileSignature,
  FileSpreadsheet,
  Plus,
  Trash2,
  Receipt,
  ScrollText,
  File,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import DocumentoUploadModal from "./DocumentoUploadModal"
import {
  listarDocumentos,
  excluirDocumento,
} from "@/actions/obras/documentos"
import { useRouter } from "next/navigation"
import {
  TipoDocumento,
  TIPO_DOCUMENTO_LABELS,
  ObraDocumento,
} from "@/actions/obras/documentos-types"

type Mode = "new" | "view" | "edit"

type Props = {
  mode: Mode
  obraId: number
  orcamentoLink?: string | null
  orcamentoId?: number | null
  propostaLink?: string | null
  contratoLink?: string | null
  ordemServicoId?: number | null
  className?: string
}

type LinkFieldProps = {
  label: string
  value?: string | null
  icon: ElementType
  onDelete?: () => void
  showDelete?: boolean
}

// Ícone por tipo de documento
const TIPO_ICONS: Record<TipoDocumento, ElementType> = {
  CONTRATO_ASSINADO: FileSignature,
  RECIBO: Receipt,
  TERMO: ScrollText,
  OUTROS: File,
}

function LinkField({ label, value, icon: Icon, onDelete, showDelete }: LinkFieldProps) {
  const href = (value ?? "").trim()
  const hasValue = href.length > 0

  return (
    <div className="w-full flex items-center gap-3 min-w-0 py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green/10">
        <Icon className="h-4 w-4 text-green" />
      </div>

      <div className="flex-1 min-w-0">
        <Label className="font-medium text-black text-sm">
          {label}
        </Label>
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
        <span className="text-black/40 text-sm shrink-0">Não vinculado</span>
      )}

      {showDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          title="Excluir documento"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
  className,
}: Props) {
  const router = useRouter()
  const [documentos, setDocumentos] = useState<ObraDocumento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const orcamentoUrl = useMemo(() => {
    if (orcamentoLink && orcamentoLink.trim()) return orcamentoLink.trim()
    if (!orcamentoId) return ""
    return `/orcamento/detalhes/${orcamentoId}`
  }, [orcamentoLink, orcamentoId])

  const ordemServicoUrl = useMemo(() => {
    if (!ordemServicoId) return ""
    return `/ordemServico/${ordemServicoId}`
  }, [ordemServicoId])

  const showExtra = mode !== "new"
  const isEditable = mode === "edit"

  // Carregar documentos dinâmicos
  async function loadDocumentos() {
    if (!obraId || mode === "new") return
    setIsLoading(true)
    try {
      const docs = await listarDocumentos(obraId)
      setDocumentos(docs)
      // Se foi upload de contrato, precisamos atualizar a data mostrada na tela principal
      router.refresh()
    } catch (error) {
      console.error("Erro ao carregar documentos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocumentos()
  }, [obraId, mode])

  // Excluir documento
  function handleDelete(docId: number) {
    startTransition(async () => {
      const result = await excluirDocumento(docId)
      if (result.success) {
        toast.success("Documento excluído")
        setDocumentos(prev => prev.filter(d => d.id !== docId))
      } else {
        toast.error(result.error || "Erro ao excluir")
      }
    })
  }

  // Contagem total de anexos
  const fixedCount = [orcamentoUrl, contratoLink, propostaLink, ordemServicoUrl].filter(v => v?.trim()).length
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
                onClick={() => setModalOpen(true)}
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
            {/* Links fixos do sistema */}
            <LinkField label="Orçamento" value={orcamentoUrl} icon={FileText} />

            <LinkField
              label="Contrato (Gerado)"
              value={showExtra ? contratoLink ?? "" : ""}
              icon={FileSignature}
            />

            <LinkField
              label="Proposta"
              value={propostaLink ?? ""}
              icon={FileSpreadsheet}
            />

            <LinkField
              label="Ordem de Serviço"
              value={showExtra ? ordemServicoUrl : ""}
              icon={FileText}
            />

            {/* Documentos dinâmicos */}
            {documentos.map((doc) => {
              const Icon = TIPO_ICONS[doc.tipo] || File
              const docUrl = doc.url || doc.link || ""
              const label = doc.titulo || TIPO_DOCUMENTO_LABELS[doc.tipo]

              return (
                <LinkField
                  key={doc.id}
                  label={label}
                  value={docUrl}
                  icon={Icon}
                  showDelete={isEditable}
                  onDelete={() => handleDelete(doc.id)}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de upload */}
      <DocumentoUploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        obraId={obraId}
        onSuccess={loadDocumentos}
      />
    </>
  )
}
