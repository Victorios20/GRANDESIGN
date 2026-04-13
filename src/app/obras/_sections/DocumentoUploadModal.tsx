"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { FileText, Link, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { criarDocumento, editarDocumento } from "@/actions/obras/documentos"
import {
  DEFAULT_FIXED_LINK_LABELS,
  type LinkKey,
} from "@/actions/obras/links-fixos"
import {
  ObraDocumento,
  TipoDocumento,
  TIPO_DOCUMENTO_LABELS,
} from "@/actions/obras/documentos-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  obraId: number
  onSuccess?: () => void
  documento?: ObraDocumento | null
  fixedLinkKey?: LinkKey | null
  fixedLinkLabel?: string
  fixedLinkUrl?: string
  onFixedLinkSave?: (
    key: LinkKey,
    url: string,
    titulo: string | null
  ) => Promise<{ success: boolean; error?: string }>
}

type InputMode = "arquivo" | "link"

const MAX_FILE_SIZE = 20 * 1024 * 1024

function getFileTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/i, "")
}

export default function DocumentoUploadModal({
  open,
  onOpenChange,
  obraId,
  onSuccess,
  documento,
  fixedLinkKey,
  fixedLinkLabel,
  fixedLinkUrl,
  onFixedLinkSave,
}: Props) {
  const isEdit = !!documento || !!fixedLinkKey
  const isFixedLink = !!fixedLinkKey
  const [inputMode, setInputMode] = useState<InputMode>("arquivo")
  const [tipo, setTipo] = useState<TipoDocumento>("CONTRATO_ASSINADO")
  const [titulo, setTitulo] = useState("")
  const [link, setLink] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLoading = isUploading || isPending

  useEffect(() => {
    if (!open) return

    if (fixedLinkKey) {
      setTitulo(fixedLinkLabel || DEFAULT_FIXED_LINK_LABELS[fixedLinkKey])
      setLink(fixedLinkUrl || "")
      setInputMode(fixedLinkUrl ? "link" : "arquivo")
      return
    }

    if (documento) {
      setTitulo(documento.titulo || "")
      setTipo(documento.tipo)
      setLink(documento.link || "")
      setInputMode(documento.url ? "arquivo" : "link")
      return
    }

    resetForm()
  }, [documento, fixedLinkKey, fixedLinkLabel, fixedLinkUrl, open])

  function resetForm() {
    setInputMode("arquivo")
    setTipo("CONTRATO_ASSINADO")
    setTitulo("")
    setLink("")
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleClose() {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo maior que 20MB")
      event.target.value = ""
      return
    }

    setSelectedFile(file)

    if (!isEdit && !titulo) {
      setTitulo(getFileTitle(file.name))
    }
  }

  async function handleSubmit() {
    if (!isFixedLink && !titulo.trim()) {
      toast.error("Título é obrigatório")
      return
    }

    if (inputMode === "link" && !link.trim()) {
      toast.error("Link é obrigatório")
      return
    }

    if (!isEdit && inputMode === "arquivo" && !selectedFile) {
      toast.error("Selecione um arquivo")
      return
    }

    setIsUploading(true)

    try {
      let fileUrl: string | null = null

      if (inputMode === "arquivo" && selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)

        const uploadRes = await fetch("/api/uploads/documento", {
          method: "POST",
          body: formData,
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || "Erro no upload")
        }

        fileUrl = uploadData.url
      }

      startTransition(async () => {
        let result

        if (fixedLinkKey && onFixedLinkSave) {
          const finalUrl = inputMode === "arquivo" ? fileUrl : link.trim()
          if (!finalUrl) {
            toast.error("É necessário selecionar um arquivo ou inserir um link")
            setIsUploading(false)
            return
          }

          result = await onFixedLinkSave(fixedLinkKey, finalUrl, titulo.trim() || null)
        } else if (documento) {
          result = await editarDocumento({
            id: documento.id,
            tipo,
            titulo: titulo.trim(),
            link: inputMode === "link" ? link.trim() : null,
            url: inputMode === "arquivo" ? fileUrl || documento.url : null,
          })
        } else {
          result = await criarDocumento({
            obraId,
            tipo,
            titulo: titulo.trim(),
            url: fileUrl,
            link: inputMode === "link" ? link.trim() : null,
          })
        }

        if (result.success) {
          toast.success(isEdit ? "Documento atualizado!" : "Documento adicionado com sucesso!")
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(result.error || "Erro ao salvar documento")
        }
      })
    } catch (error) {
      console.error("Erro ao processar documento:", error)
      toast.error("Erro ao processar documento")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green" />
            {isEdit ? "Editar Documento" : "Adicionar Documento"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInputMode("arquivo")}
              disabled={isLoading}
              className={`flex-1 h-8 text-sm font-medium transition-all ${inputMode === "arquivo" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-900"}`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload de Arquivo
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInputMode("link")}
              disabled={isLoading}
              className={`flex-1 h-8 text-sm font-medium transition-all ${inputMode === "link" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-900"}`}
            >
              <Link className="h-4 w-4 mr-2" />
              Inserir Link
            </Button>
          </div>

          {!fixedLinkKey && (
            <div className="grid gap-2">
              <Label htmlFor="tipo" className="text-sm font-medium text-gray-700">
                Tipo de documento
              </Label>
              <Select
                value={tipo}
                onValueChange={(value) => setTipo(value as TipoDocumento)}
                disabled={isLoading}
              >
                <SelectTrigger id="tipo" className="focus-visible:ring-green">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_DOCUMENTO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="titulo" className="text-sm font-medium text-gray-700">
              Título do documento {!isFixedLink && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex: Contrato de Prestação de Serviço"
              disabled={isLoading}
              className="focus-visible:ring-green"
            />
          </div>

          {inputMode === "arquivo" && (
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">
                Arquivo (até 20MB) <span className="text-red-500">*</span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex-1 justify-start py-6 bg-white border-2 border-dashed border-gray-300 text-gray-600 font-normal text-left truncate hover:bg-green/5 hover:text-green hover:border-green/50 hover:shadow-sm transition-all"
                >
                  <Upload className="h-4 w-4 mr-3 shrink-0 opacity-50" />
                  <span className="truncate">
                    {selectedFile ? selectedFile.name : "Clique para selecionar um arquivo..."}
                  </span>
                </Button>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                    disabled={isLoading}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          )}

          {inputMode === "link" && (
            <div className="grid gap-2">
              <Label htmlFor="link" className="text-sm font-medium text-gray-700">
                Link do documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://..."
                disabled={isLoading}
                className="focus-visible:ring-green"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3 sm:space-x-0 pt-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green text-white hover:bg-green/90 min-w-[100px]"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
