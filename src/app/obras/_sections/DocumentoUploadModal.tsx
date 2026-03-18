"use client"

import { useState, useRef, useTransition, useEffect } from "react"
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
import { TipoDocumento, TIPO_DOCUMENTO_LABELS, ObraDocumento } from "@/actions/obras/documentos-types"
import { criarDocumento, editarDocumento } from "@/actions/obras/documentos"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    obraId: number
    onSuccess?: () => void
    documento?: ObraDocumento | null

    fixedLinkKey?: "orcamento" | "contrato" | "proposta" | "ordemServico" | null
    fixedLinkLabel?: string
    fixedLinkUrl?: string
    onFixedLinkSave?: (key: string, url: string) => Promise<{ success: boolean; error?: string }>
}

type InputMode = "arquivo" | "link"

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
    const [inputMode, setInputMode] = useState<InputMode>("arquivo")
    const [tipo, setTipo] = useState<TipoDocumento>("CONTRATO_ASSINADO")
    const [titulo, setTitulo] = useState("")
    const [link, setLink] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isLoading = isUploading || isPending

    // Inicializar estado ao abrir para edição
    useEffect(() => {
        if (open) {
            if (fixedLinkKey) {
                setTitulo(fixedLinkLabel || "")
                setLink(fixedLinkUrl || "")
                setInputMode(fixedLinkUrl ? "link" : "arquivo")
            } else if (documento) {
                setTitulo(documento.titulo || "")
                setTipo(documento.tipo)
                const docLink = documento.link || ""
                setLink(docLink)
                setInputMode(documento.url ? "arquivo" : "link")
            } else {
                resetForm()
            }
        }
    }, [open, documento, fixedLinkKey, fixedLinkLabel, fixedLinkUrl])

    function resetForm() {
        setInputMode("arquivo")
        setTipo("CONTRATO_ASSINADO")
        setTitulo("")
        setLink("")
        setSelectedFile(null)
    }

    function handleClose() {
        if (!isLoading) {
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
        // Auto-preencher título com nome do arquivo (só se estiver criando)
        if (!isEdit && !titulo) {
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

        if (!isEdit && inputMode === "arquivo" && !selectedFile) {
            toast.error("Selecione um arquivo")
            return
        }

        setIsUploading(true)

        try {
            let fileUrl: string | null = null

            // Se modo arquivo e tiver novo arquivo, fazer upload
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

            // Ação no banco (Criar ou Editar)
            startTransition(async () => {
                let result;
                if (fixedLinkKey && onFixedLinkSave) {
                    const finalUrl = inputMode === "arquivo" ? fileUrl : link.trim();
                    if (!finalUrl) {
                        toast.error("É necessário selecionar um arquivo ou inserir um link")
                        setIsUploading(false)
                        return
                    }
                    result = await onFixedLinkSave(fixedLinkKey, finalUrl)
                } else if (documento) {
                    result = await editarDocumento({
                        id: documento.id,
                        tipo,
                        titulo: titulo.trim(),
                        link: inputMode === "link" ? link.trim() : null,
                        url: inputMode === "arquivo" ? (fileUrl || documento.url) : null,
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
                    {/* Modo: Arquivo ou Link */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
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
                            <Label htmlFor="tipo" className="text-sm font-medium text-gray-700">Tipo de documento</Label>
                            <Select
                                value={tipo}
                                onValueChange={(v) => setTipo(v as TipoDocumento)}
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
                        <Label htmlFor="titulo" className="text-sm font-medium text-gray-700">Título do documento <span className="text-red-500">*</span></Label>
                        <Input
                            id="titulo"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="Ex: Contrato de Prestação de Serviço"
                            disabled={isLoading || !!fixedLinkKey}
                            className="focus-visible:ring-green disabled:bg-gray-50"
                        />
                    </div>

                    {/* Upload de arquivo */}
                    {inputMode === "arquivo" && (
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium text-gray-700">Arquivo (PDF até 20MB) <span className="text-red-500">*</span></Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
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
                                    <span className="truncate">{selectedFile ? selectedFile.name : "Clique para selecionar o PDF..."}</span>
                                </Button>
                                {selectedFile && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                            setSelectedFile(null)
                                            if (fileInputRef.current) fileInputRef.current.value = ""
                                        }}
                                        disabled={isLoading}
                                    >
                                        Remover
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Input de link */}
                    {inputMode === "link" && (
                        <div className="grid gap-2">
                            <Label htmlFor="link" className="text-sm font-medium text-gray-700">Link do documento <span className="text-red-500">*</span></Label>
                            <Input
                                id="link"
                                type="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
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
