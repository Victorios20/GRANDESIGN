/* src/components/ui/checkbox.tsx */
"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox(
  { className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>,
) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        /* ─────────────── TAMANHO, BORDAS, ETC ─────────────── */
        "peer size-4 shrink-0 rounded-[4px] shadow-xs outline-none transition-shadow",

        /* ─────────────── ESTADO DESMARCADO ─────────────── */
        // Borda bege quando desmarcado
        "border border-bege",
        // Fundo padrão (escuro se dark mode)
        "dark:bg-input/30",

       /* ─────────────── ESTADO MARCADO ─────────────── */
// Fundo bege quando marcado (cor arbitrária via Tailwind)
"data-[state=checked]:bg-bege",
// Borda bege quando marcado
"data-[state=checked]:border-bege",


        /* ─────────────── FOCUS E VALIDAÇÕES ─────────────── */
        // Anel de foco acessível
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
        // Borda vermelha se inválido (formulário)
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",

        /* ─────────────── ESTADO DISABLED ─────────────── */
        "disabled:cursor-not-allowed disabled:opacity-50",

        /* ─────────────── ESTILOS EXTERNOS ─────────────── */
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center transition-none"
      >
        {/* Ícone de check (✓) em marrom escuro — ALTERE AQUI para `text-white` se quiser ele branco */}
        <CheckIcon className="size-3.5 text-marromEscuro" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
