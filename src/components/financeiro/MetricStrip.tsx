"use client"

import { cn } from "@/lib/utils"

export type MetricTone = "positive" | "negative" | "neutral" | "warning" | "info"

export interface MetricStripItem {
    label: string
    value: string
    helper?: string
    tone?: MetricTone
}

interface MetricStripProps {
    items: MetricStripItem[]
    className?: string
    compact?: boolean
}

const toneClasses: Record<MetricTone, { value: string; helper: string }> = {
    positive: {
        value: "text-[#166534]",
        helper: "text-[#166534]/70",
    },
    negative: {
        value: "text-[#B42318]",
        helper: "text-[#B42318]/70",
    },
    neutral: {
        value: "text-[#2C201B]",
        helper: "text-[#2C201B]/58",
    },
    warning: {
        value: "text-[#9A6700]",
        helper: "text-[#9A6700]/72",
    },
    info: {
        value: "text-[#175CD3]",
        helper: "text-[#175CD3]/72",
    },
}

export function MetricStrip({ items, className, compact = false }: MetricStripProps) {
    if (compact) {
        return (
            <section
                className={cn(
                    "grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#ece6db] pt-3 lg:grid-cols-4",
                    className
                )}
            >
                {items.map((item) => {
                    const tone = toneClasses[item.tone ?? "neutral"]

                    return (
                        <div key={item.label} className="min-w-0 space-y-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b705f]">
                                {item.label}
                            </p>
                            <p className={cn("text-sm font-semibold sm:text-base", tone.value)}>{item.value}</p>
                            <p className={cn("min-h-4 text-[11px]", tone.helper)}>{item.helper ?? "\u00A0"}</p>
                        </div>
                    )
                })}
            </section>
        )
    }

    return (
        <section
            className={cn(
                "overflow-hidden rounded-xl border border-[#2C201B]/10 bg-[#2C201B]/8",
                className
            )}
        >
            <div className="grid grid-cols-2 gap-px bg-[#2C201B]/10 lg:grid-cols-4">
                {items.map((item) => {
                    const tone = toneClasses[item.tone ?? "neutral"]

                    return (
                        <div key={item.label} className="min-w-0 bg-[#FFFCF7] px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2C201B]/46">
                                {item.label}
                            </p>
                            <p className={cn("mt-1 text-lg font-semibold sm:text-xl", tone.value)}>
                                {item.value}
                            </p>
                            <p className={cn("mt-1 min-h-4 text-xs", tone.helper)}>
                                {item.helper ?? "\u00A0"}
                            </p>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
