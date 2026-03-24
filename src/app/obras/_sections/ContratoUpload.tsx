"use client"

import { useRef, useState, useTransition } from "react"
import {
  Calendar,
  CheckCircle,
  ExternalLink,
  FileSignature,
  Loader2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { saveContrato } from "@/actions/obras/save-contrato"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Mode = "new" | "view" | "edit"

type Props = {
  mode: Mode
  obraId: number
  linkContrato?: string | null
  dataContrato?: string | null
  className?: string
}

const MAX_FILE_SIZE = 20 * 1024 * 1024

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return ""

  const normalized = String(isoString).trim()
  const dateLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
  const date = dateLike
    ? new Date(Number(dateLike[1]), Number(dateLike[2]) - 1, Number(dateLike[3]))
    : new Date(normalized)

  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getFileName(url: string): string {
  const parts = url.split("/")
  return parts[parts.length - 1] || "contrato-anexo"
}

export default function ContratoUpload({
  mode,
  obraId,
  linkContrato: initialLink,
  dataContrato: initialDate,
  className,
}: Props) {
  const [savedLink, setSavedLink] = useState(initialLink || "")
  const [savedDate, setSavedDate] = useState(initialDate || "")
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasSavedContract = savedLink.trim().length > 0
  const isEditable = mode === "edit" || mode === "new"
  const isLoading = isUploading || isPending

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo maior que 20MB")
      event.target.value = ""
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/uploads/contrato", {
        method: "POST",
        body: formData,
      })

      const uploadData = await uploadRes.json()

      if (!uploadRes.ok || !uploadData.ok) {
        throw new Error(uploadData.message || "Falha no upload")
      }

      startTransition(async () => {
        const result = await saveContrato(obraId, uploadData.url)
        if (result.ok) {
          setSavedLink(result.linkContrato)
          setSavedDate(result.dataContrato)
          toast.success("Contrato salvo com sucesso!")
        } else {
          toast.error("Erro ao salvar contrato no banco de dados")
        }
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer upload do contrato"
      toast.error(message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  return (
    <Card className={`w-full rounded-2xl border-0 shadow-md bg-white ${className ?? ""}`}>
      <CardHeader className="px-7 pt-7 pb-3">
        <CardTitle className="flex items-center gap-2 text-green text-xl">
          <FileSignature className="h-5 w-5" />
          Contrato Assinado (Upload)
        </CardTitle>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        {hasSavedContract ? (
          <div className="space-y-3">
            <a
              href={savedLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="truncate flex-1">{getFileName(savedLink)}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>

            {savedDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Salvo em {formatDate(savedDate)}</span>
              </div>
            )}

            <div className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={!isEditable || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Substituir contrato
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              FaÃ§a upload do contrato assinado para registrar a data de inÃ­cio da obra.
            </p>
            <Button
              variant="default"
              onClick={handleUploadClick}
              disabled={!isEditable || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer upload do contrato
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
