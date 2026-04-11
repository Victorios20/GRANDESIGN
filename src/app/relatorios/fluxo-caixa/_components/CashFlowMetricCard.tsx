import { cn } from "@/lib/utils"

type Tone = "default" | "accent" | "muted" | "positive"
type Variant = "default" | "primary" | "analytics"

type Props = {
    label: string
    value: string
    supportingText?: string
    tone?: Tone
    variant?: Variant
}

/**
 * Shell base dos cards de métrica.
 * - `primary`: card âncora (ex: Saldo atual) — borda esquerda grossa como marcador visual
 * - `analytics`: cards de análise (Pior/Melhor/Dias críticos) — superfície diferenciada
 * - `default`: métricas padrão de resumo
 */

const SHELL_CLASSES: Record<Variant, string> = {
    default:
        "h-full min-h-[128px] rounded-2xl border border-[#e8e1d6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
    primary:
        "h-full min-h-[128px] rounded-2xl border border-[#e8e1d6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] border-l-[3px] border-l-[#393316]",
    analytics:
        "h-full min-h-[128px] rounded-2xl border border-[#e8e1d6] bg-[#f6f2e7] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
}

// Cor do valor numérico por tone
const VALUE_COLOR: Record<Tone, string> = {
    default:   "text-[#2c201b]",
    accent:    "text-[#9b4b1d]",   // vermelho terroso — "pior", "crítico"
    muted:     "text-[#393316]",
    positive:  "text-[#2f7a52]",   // verde escuro — "melhor"
}

export function CashFlowMetricCard({
    label,
    value,
    supportingText,
    tone = "default",
    variant = "default",
}: Props) {
    const isPrimary   = variant === "primary"
    const isAnalytics = variant === "analytics"

    return (
        <div className={SHELL_CLASSES[variant]}>
            <div className={cn(
                "flex h-full flex-col",
                isPrimary   ? "gap-1 px-5 py-5"    :
                isAnalytics ? "gap-1 px-5 py-5"    :
                              "gap-1 px-5 py-5"
            )}>
                {/* Label */}
                <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.12em]",
                    isAnalytics ? "text-[#7b705f]" : "text-[#9a8f7c]"
                )}>
                    {label}
                </p>

                {/* Valor */}
                <p className={cn(
                    "mt-1 tabular-nums font-bold leading-none tracking-tight",
                    "text-[1.55rem]",
                    VALUE_COLOR[tone]
                )}>
                    {value}
                </p>

                {/* Supporting text */}
                {supportingText ? (
                    <p className={cn(
                        "mt-auto pt-2 text-[11px] leading-4",
                        isAnalytics ? "text-[#7b705f]" : "text-[#9a8f7c]"
                    )}>
                        {supportingText}
                    </p>
                ) : null}
            </div>
        </div>
    )
}
