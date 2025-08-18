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
}

export default function CopyLinkButton({ value, label = "Copiar", className }: Props) {
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

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleCopy}
            disabled={!value}
            aria-pressed={copied}
            aria-label={copied ? "Copiado!" : label}
            title={copied ? "Copiado!" : label}
            className={cn(
              "h-8 w-8 bg-bege text-marromEscuro hover:bg-bege/80 focus-visible:ring-2 focus-visible:ring-marromEscuro/40 transition-transform active:scale-95",
              className
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{copied ? "Copiado!" : label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
