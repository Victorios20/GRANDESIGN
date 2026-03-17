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
  Pencil,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import DocumentoUploadModal from "./DocumentoUploadModal"
import {
  listarDocumentos,
  excluirDocumento,
  editarDocumento,
  reordenarDocumentos,
} from "@/actions/obras/documentos"
import { atualizarLinkObra, type LinkKey } from "@/actions/obras/atualizar-links-obra"
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

// Ícone por tipo de documento
const TIPO_ICONS: Record<TipoDocumento, ElementType> = {
  CONTRATO_ASSINADO: FileSignature,
  RECIBO: Receipt,
  TERMO: ScrollText,
  OUTROS: File,
}

function LinkField({ label, value, icon: Icon, onDelete, onEdit, onMoveUp, onMoveDown, showEditDelete }: LinkFieldProps) {
  const href = (value ?? "").trim()
  const hasValue = href.length > 0

  return (
    <div className="w-full flex items-center gap-2 min-w-0 py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
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

      {showEditDelete && (
        <div className="flex items-center gap-0.5 ml-1">
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded transition-colors" title="Mover para cima">
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded transition-colors" title="Mover para baixo">
              <ArrowDown className="w-4 h-4" />
            </button>
          )}
          {onEdit && (
            <button type="button" onClick={onEdit} className="p-1.5 text-black/40 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors" title="Excluir">
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
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  
  // Estados para edição
  const [editDoc, setEditDoc] = useState<ObraDocumento | null>(null)
  const [editTitulo, setEditTitulo] = useState("")
  const [editTipo, setEditTipo] = useState<TipoDocumento>("OUTROS")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const [isPending, startTransition] = useTransition()

  // Estado para edição de links fixos
  const [fixedEditKey, setFixedEditKey] = useState<LinkKey | null>(null)
  const [fixedEditUrl, setFixedEditUrl] = useState("")
  const [fixedEditLabel, setFixedEditLabel] = useState("")

  const baseOrcamentoUrl = useMemo(() => {
    if (orcamentoLink && orcamentoLink.trim()) return orcamentoLink.trim()
    if (!orcamentoId) return ""
    return `/orcamento/detalhes/${orcamentoId}`
  }, [orcamentoLink, orcamentoId])

  // Links locais editáveis (para atualização imediata sem refresh)
  const [localOrcamento, setLocalOrcamento] = useState(baseOrcamentoUrl)
  const [localContrato, setLocalContrato] = useState(contratoLink ?? "")
  const [localProposta, setLocalProposta] = useState(propostaLink ?? "")
  const [localOrdemServico, setLocalOrdemServico] = useState(ordemServicoLink ?? "")

  // Sync when props change (após router.refresh)
  useEffect(() => { setLocalOrcamento(baseOrcamentoUrl) }, [baseOrcamentoUrl])
  useEffect(() => { setLocalContrato(contratoLink ?? "") }, [contratoLink])
  useEffect(() => { setLocalProposta(propostaLink ?? "") }, [propostaLink])
  useEffect(() => { setLocalOrdemServico(ordemServicoLink ?? "") }, [ordemServicoLink])

  const orcamentoUrl = useMemo(() => {
    const base = localOrcamento.trim()
    if (base) return base
    return baseOrcamentoUrl
  }, [localOrcamento, baseOrcamentoUrl])

  const ordemServicoUrl = useMemo(() => {
    const base = localOrdemServico.trim()
    if (base) return base
    if (!ordemServicoId) return ""
    return `/ordemServico/${ordemServicoId}`
  }, [localOrdemServico, ordemServicoId, ordemServicoLink])

  const showExtra = mode !== "new"
  const isEditable = mode !== "new"

  // Carregar documentos dinâmicos
  async function loadDocumentos() {
    if (!obraId || mode === "new") return
    setIsLoading(true)
    try {
      const docs = await listarDocumentos(obraId)
      // Garantir ordenação por ordem ascendente
      docs.sort((a, b) => (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER))
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

  // Editar documento (abrir modal)
  function handleEditClick(doc: ObraDocumento) {
    setEditDoc(doc)
    setEditTitulo(doc.titulo)
    setEditTipo(doc.tipo)
    setIsEditModalOpen(true)
  }

  // Salvar edição
  function handleEditSave() {
    if (!editDoc) return
    startTransition(async () => {
      const result = await editarDocumento({
        id: editDoc.id,
        titulo: editTitulo,
        tipo: editTipo,
      })
      if (result.success) {
        toast.success("Documento atualizado")
        setDocumentos(prev =>
          prev.map(d =>
            d.id === editDoc.id
              ? { ...d, titulo: editTitulo, tipo: editTipo }
              : d
          )
        )
        setIsEditModalOpen(false)
      } else {
        toast.error(result.error || "Erro ao atualizar documento")
      }
    })
  }

  // Reordenar documento
  function handleMove(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === documentos.length - 1) return

    const newDocs = [...documentos]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    
    const temp = newDocs[index]
    newDocs[index] = newDocs[swapIndex]
    newDocs[swapIndex] = temp

    // Set local state for immediate feedback
    setDocumentos(newDocs)

    // Save to DB
    startTransition(async () => {
      const updates = newDocs.map((d, i) => ({ id: d.id, ordem: i }))
      const result = await reordenarDocumentos(updates)
      if (!result.success) {
        toast.error("Erro ao reordenar")
        loadDocumentos() // revert local state
      }
    })
  }

  function openFixedEdit(key: LinkKey, label: string, currentUrl: string) {
    setFixedEditKey(key)
    setFixedEditLabel(label)
    setFixedEditUrl(currentUrl)
  }

  function handleFixedEditSave() {
    if (!fixedEditKey || !obraId) return
    startTransition(async () => {
      const result = await atualizarLinkObra(obraId, fixedEditKey, fixedEditUrl || null)
      if (result.success) {
        toast.success("Link atualizado com sucesso")
        if (fixedEditKey === "orcamento") setLocalOrcamento(fixedEditUrl)
        if (fixedEditKey === "contrato") setLocalContrato(fixedEditUrl)
        if (fixedEditKey === "proposta") setLocalProposta(fixedEditUrl)
        if (fixedEditKey === "ordemServico") setLocalOrdemServico(fixedEditUrl)
        setFixedEditKey(null)
        router.refresh()
      } else {
        toast.error(result.error || "Erro ao salvar link")
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
            <LinkField
              label="Orçamento"
              value={orcamentoUrl}
              icon={FileText}
              showEditDelete={showExtra}
              onEdit={() => openFixedEdit("orcamento", "Orçamento", orcamentoUrl)}
            />

            <LinkField
              label="Contrato (Gerado)"
              value={showExtra ? localContrato : ""}
              icon={FileSignature}
              showEditDelete={showExtra}
              onEdit={() => openFixedEdit("contrato", "Contrato (Gerado)", localContrato)}
            />

            <LinkField
              label="Proposta"
              value={localProposta}
              icon={FileSpreadsheet}
              showEditDelete={showExtra}
              onEdit={() => openFixedEdit("proposta", "Proposta", localProposta)}
            />

            <LinkField
              label="Ordem de Serviço"
              value={showExtra ? ordemServicoUrl : ""}
              icon={FileText}
              showEditDelete={showExtra}
              onEdit={() => openFixedEdit("ordemServico", "Ordem de Serviço", localOrdemServico)}
            />

            {/* Documentos dinâmicos */}
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
                  onMoveDown={index < documentos.length - 1 ? () => handleMove(index, "down") : undefined}
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

      {/* Modal de Edição de Link Fixo */}
      <Dialog open={!!fixedEditKey} onOpenChange={(open) => !open && !isPending && setFixedEditKey(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar link do documento</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-3">
            <div>
               <Label htmlFor="fixed-url" className="text-sm font-medium text-gray-700">URL ({fixedEditLabel})</Label>
               <Input
                 id="fixed-url"
                 className="mt-1.5 focus-visible:ring-green"
                 placeholder="https://..."
                 value={fixedEditUrl}
                 onChange={(e) => setFixedEditUrl(e.target.value)}
                 disabled={isPending}
               />
            </div>
            <p className="text-sm text-gray-500">
               Cole o link do Google Drive, Dropbox ou do sistema associado a este anexo fixo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFixedEditKey(null)} disabled={isPending}>
               Cancelar
            </Button>
            <Button
              className="bg-green text-white hover:bg-green/90 min-w-[100px]"
              onClick={handleFixedEditSave}
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Salvar Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Documento */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título (*)</Label>
              <Input
                id="titulo"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={editTipo}
                onValueChange={(val) => setEditTipo(val as TipoDocumento)}
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_DOCUMENTO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green text-white hover:bg-green/90"
              onClick={handleEditSave}
              disabled={isPending || !editTitulo.trim()}
            >
              Salvar 
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
