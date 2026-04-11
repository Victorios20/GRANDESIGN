import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CashFlowDayStatus } from "@/types/financeiro"

import { getCashFlowStatusClasses, getCashFlowStatusLabel } from "./cash-flow-view-model"

type Props = {
    status: CashFlowDayStatus
    className?: string
}

export function CashFlowStatusBadge({ status, className }: Props) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em]",
                getCashFlowStatusClasses(status),
                className,
            )}
        >
            {getCashFlowStatusLabel(status)}
        </Badge>
    )
}
