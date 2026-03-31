import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Props = {
    label: string
    value: string
    supportingText?: string
    tone?: "default" | "accent" | "muted"
}

const TONE_CLASSES = {
    default: "border-[rgba(44,32,27,0.08)] bg-white text-[#2c201b]",
    accent: "border-[rgba(245,209,147,0.92)] bg-[rgba(245,209,147,0.24)] text-[#2c201b]",
    muted: "border-[rgba(44,32,27,0.08)] bg-[rgba(250,243,224,0.58)] text-[#393316]",
} as const

export function CashFlowMetricCard({
    label,
    value,
    supportingText,
    tone = "default",
}: Props) {
    return (
        <Card className={cn("rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]", TONE_CLASSES[tone])}>
            <CardContent className="space-y-2 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                    {label}
                </p>
                <p className="text-[1.7rem] font-semibold tracking-[-0.03em] text-current">
                    {value}
                </p>
                {supportingText ? (
                    <p className="text-xs leading-5 text-[rgba(44,32,27,0.68)]">
                        {supportingText}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    )
}
