import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface ModalSucessoPropostaProps {
    open: boolean
    onClose: () => void
    slideUrl?: string
    clearAll: () => void  // Função para limpar todos os dados
}

export default function ModalSucessoProposta({
    open,
    onClose,
    slideUrl,
    clearAll,
}: ModalSucessoPropostaProps) {
    const router = useRouter()

    useEffect(() => {
        if (!open) return
        const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose()
        window.addEventListener("keydown", esc)
        return () => window.removeEventListener("keydown", esc)
    }, [open, onClose])

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="rounded-2xl p-6"
                style={{ width: "100%", maxWidth: "600px" }}
            >
                <div className="flex justify-center">
                    <div className="rounded-full border-[6px] border-green-500 p-4">
                        <Check className="h-12 w-12 text-green-500" strokeWidth={2.5} />
                    </div>
                </div>

                <DialogHeader className="items-center mt-6">
                    <DialogTitle className="text-green-700 text-lg font-semibold text-center">
                        Proposta gerada com sucesso!
                    </DialogTitle>
                </DialogHeader>

                <p className="text-center text-sm text-muted-foreground mt-2">
                    Sua proposta foi salva e o slide está disponível para visualização.
                </p>

                <DialogFooter className="mt-8 px-2">
                    <div className="flex justify-between w-full gap-4">
                        <Button
                            onClick={() => router.push("/")}
                            className="px-6 bg-marromEscuro text-white hover:bg-marromEscuro/90"
                        >
                            Ir para a Home
                        </Button>

                        <Button
                            variant="outline"
                            className="px-6"
                            disabled={!slideUrl}
                            title={!slideUrl ? "Sem slide disponível" : ""}
                            onClick={() => {
                                if (!slideUrl) return
                                window.open(slideUrl, "_blank", "noopener,noreferrer")
                            }}
                        >
                            Slide da proposta
                        </Button>


                        {/* Novo Orçamento Button */}
                        <Button
                            onClick={() => {
                                clearAll()
                                onClose() // Fecha o modal após resetar os dados
                            }}
                            className="px-6 bg-marromEscuro text-white"
                        >
                            Novo Orçamento
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
