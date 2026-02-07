"use client"

import { useState, useRef, useTransition } from "react"
import { Upload, Link, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

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
import { criarDocumento } from "@/actions/obras/documentos"
import { TipoDocumento, TIPO_DOCUMENTO_LABELS } from "@/actions/obras/documentos-types"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    obraId: number
    onSuccess?: () => void
}

type InputMode = "arquivo" | "link"

export default function DocumentoUploadModal({
    open,
    onOpenChange,
    obraId,
    onSuccess,
}: Props) {
    const [inputMode, setInputMode] = useState<InputMode>("arquivo")
    const [tipo, setTipo] = useState<TipoDocumento>("CONTRATO_ASSINADO")
    const [titulo, setTitulo] = useState("")
    const [link, setLink] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isLoading = isUploading || isPending

    function resetForm() {
        setInputMode("arquivo")
        setTipo("CONTRATO_ASSINADO")
        setTitulo("")
        setLink("")
        setSelectedFile(null)
    }

    function handleClose() {
        if (!isLoading) {
            resetForm()
            onOpenChange(false)
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo de arquivo (PDF)
        if (file.type !== "application/pdf") {
            toast.error("Apenas arquivos PDF são permitidos")
            return
        }

        // Validar tamanho (20MB max)
        if (file.size > 20 * 1024 * 1024) {
            toast.error("Arquivo maior que 20MB")
            return
        }

        setSelectedFile(file)
        // Auto-preencher título com nome do arquivo
        if (!titulo) {
            const name = file.name.replace(/\.pdf$/i, "")
            setTitulo(name)
        }
    }

    async function handleSubmit() {
        // Validações
        if (!titulo.trim()) {
            toast.error("Título é obrigatório")
            return
        }

        if (inputMode === "link" && !link.trim()) {
            toast.error("Link é obrigatório")
            return
        }

        if (inputMode === "arquivo" && !selectedFile) {
            toast.error("Selecione um arquivo")
            return
        }

        setIsUploading(true)

        try {
            let fileUrl: string | null = null

            // Se modo arquivo, fazer upload primeiro
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

            // Criar documento no banco
            startTransition(async () => {
                const result = await criarDocumento({
                    obraId,
                    tipo,
                    titulo: titulo.trim(),
                    url: fileUrl,
                    link: inputMode === "link" ? link.trim() : null,
                })

                if (result.success) {
                    toast.success("Documento adicionado com sucesso!")
                    resetForm()
                    onOpenChange(false)
                    onSuccess?.()
                } else {
                    toast.error(result.error || "Erro ao salvar documento")
                }
            })
        } catch (error) {
            console.error("Erro ao adicionar documento:", error)
            toast.error("Erro ao adicionar documento")
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
                        Adicionar Documento
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Tipo de documento */}
                    <div className="grid gap-2">
                        <Label htmlFor="tipo">Tipo de documento</Label>
                        <Select
                            value={tipo}
                            onValueChange={(v) => setTipo(v as TipoDocumento)}
                            disabled={isLoading}
                        >
                            <SelectTrigger id="tipo">
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

                    {/* Título */}
                    <div className="grid gap-2">
                        <Label htmlFor="titulo">Título</Label>
                        <Input
                            id="titulo"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="Ex: Contrato de Prestação de Serviço"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Modo: Arquivo ou Link */}
                    <div className="grid gap-2">
                        <Label>Origem</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={inputMode === "arquivo" ? "default" : "outline"}
                                onClick={() => setInputMode("arquivo")}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                <Upload className="h-4 w-4 mr-1" />
                                Arquivo
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={inputMode === "link" ? "default" : "outline"}
                                onClick={() => setInputMode("link")}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                <Link className="h-4 w-4 mr-1" />
                                Link
                            </Button>
                        </div>
                    </div>

                    {/* Upload de arquivo */}
                    {inputMode === "arquivo" && (
                        <div className="grid gap-2">
                            <Label>Arquivo (PDF até 20MB)</Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="w-full justify-start"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {selectedFile ? selectedFile.name : "Selecionar arquivo"}
                            </Button>
                        </div>
                    )}

                    {/* Input de link */}
                    {inputMode === "link" && (
                        <div className="grid gap-2">
                            <Label htmlFor="link">Link do documento</Label>
                            <Input
                                id="link"
                                type="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                placeholder="https://..."
                                disabled={isLoading}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
