"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  label?: string
  className?: string
  /** opcional; padrão "bege" para compatibilidade */
  color?: "bege" | "green"
}

export default function CopyLinkButton({
  value,
  label = "Copiar",
  className,
  color = "bege",
}: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copiado!`)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      toast.error("Não foi possível copiar.")
    }
  }

  const colorClasses =
    color === "green"
      ? // verde: manter branco SEMPRE (normal e hover)
        "bg-green text-white hover:bg-green/90 hover:text-white disabled:text-white disabled:bg-green/60 focus-visible:ring-green/40"
      : // bege: comportamento antigo
        "bg-bege text-marromEscuro hover:bg-bege/80 hover:text-marromEscuro disabled:text-marromEscuro/60 focus-visible:ring-marromEscuro/40"

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            onClick={handleCopy}
            disabled={!value}
            aria-pressed={copied}
            aria-label={copied ? "Copiado!" : label}
            title={copied ? "Copiado!" : label}
            className={cn(
              // base do botão
              "h-8 w-8 rounded-xl transition-transform active:scale-95 focus-visible:ring-2",
              // cores por variante
              colorClasses,
              // garante que o ícone herde a cor do texto (branco no verde)
              "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-current",
              className
            )}
          >
            {copied ? <Check /> : <Copy />}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{copied ? "Copiado!" : label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
