"use client"

import { useState, useRef, useTransition } from "react"
import { FileSignature, Upload, ExternalLink, CheckCircle, Calendar, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { saveContrato } from "@/actions/obras/save-contrato"

type Mode = "new" | "view" | "edit"

type Props = {
    mode: Mode
    obraId: number
    linkContrato?: string | null
    dataContrato?: string | null
    className?: string
}

function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return ""
    const d = new Date(isoString)
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    })
}

function getFileName(url: string): string {
    const parts = url.split("/")
    return parts[parts.length - 1] || "contrato.pdf"
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

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (file.type !== "application/pdf") {
            toast.error("Apenas arquivos PDF são permitidos")
            return
        }

        // Validate file size (20MB max)
        if (file.size > 20 * 1024 * 1024) {
            toast.error("Arquivo maior que 20MB")
            return
        }

        setIsUploading(true)

        try {
            // Upload to S3
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

            // Save link and date to database
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
        } catch (err: any) {
            toast.error(err.message || "Erro ao fazer upload do contrato")
        } finally {
            setIsUploading(false)
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    function handleUploadClick() {
        fileInputRef.current?.click()
    }

    const isLoading = isUploading || isPending

    return (
        <Card className={`w-full rounded-2xl border-0 shadow-md bg-white ${className ?? ""}`}>
            <CardHeader className="px-7 pt-7 pb-3">
                <CardTitle className="flex items-center gap-2 text-green text-xl">
                    <FileSignature className="h-5 w-5" />
                    Contrato Assinado (Upload)
                </CardTitle>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-4">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />

                {hasSavedContract ? (
                    <div className="space-y-3">
                        {/* Contract link */}
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

                        {/* Contract date */}
                        {savedDate && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Salvo em {formatDate(savedDate)}</span>
                            </div>
                        )}

                        {/* Replace contract button - always available */}
                        <div className="pt-3 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleUploadClick}
                                disabled={isLoading}
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
                            Faça upload do contrato assinado (PDF) para registrar a data de início da obra.
                        </p>
                        <Button
                            variant="default"
                            onClick={handleUploadClick}
                            disabled={isLoading}
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
