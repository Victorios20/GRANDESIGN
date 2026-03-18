import { getObraStatusMeta } from "@/lib/obra-status"
import { cn } from "@/lib/utils"

type ObraStatusBadgeProps = {
  status?: string | null
  layout?: "compact" | "multiline"
  className?: string
}

const toneClasses = {
  contract: {
    badge: "border-[#d8c0a0] bg-[#f6ede0] text-[#6f4d31]",
    dot: "bg-[#a36d42]",
  },
  technical: {
    badge: "border-[#d7cfad] bg-[#f4f0e2] text-[#665b34]",
    dot: "bg-[#8b7a32]",
  },
  procurement: {
    badge: "border-[#bfd1ba] bg-[#eaf2e8] text-[#36583a]",
    dot: "bg-[#4c744d]",
  },
  scheduled: {
    badge: "border-[#c8d3c2] bg-[#eef3eb] text-[#486247]",
    dot: "bg-[#5c7a59]",
  },
  active: {
    badge: "border-[#a5be9f] bg-[#e0eadc] text-[#284a30]",
    dot: "bg-[#376139]",
  },
  billing: {
    badge: "border-[#e0c3a0] bg-[#f8eee2] text-[#7a5331]",
    dot: "bg-[#a86d3f]",
  },
  issue: {
    badge: "border-[#ddb2a7] bg-[#f7e5e0] text-[#863f34]",
    dot: "bg-[#b15a4a]",
  },
  done: {
    badge: "border-[#b7cab2] bg-[#e5eee3] text-[#315438]",
    dot: "bg-[#4c7a50]",
  },
  neutral: {
    badge: "border-[#d7cfc3] bg-[#f3f0ea] text-[#5f5a52]",
    dot: "bg-[#81786c]",
  },
} as const

export function ObraStatusBadge({
  status,
  layout = "multiline",
  className,
}: ObraStatusBadgeProps) {
  const meta = getObraStatusMeta(status)

  if (meta.label === "-") {
    return <span className="text-sm text-muted-foreground">-</span>
  }

  const palette = toneClasses[meta.tone]
  const isCompact = layout === "compact"

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 align-middle text-[11px] font-semibold tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] sm:text-xs",
        isCompact
          ? "max-w-[11.5rem] whitespace-nowrap py-0.5 leading-none"
          : "max-w-[14rem] whitespace-normal py-0.5 leading-[1.2]",
        palette.badge,
        className
      )}
      aria-label={`Status da obra: ${meta.label}`}
      title={meta.label}
    >
      <span
        aria-hidden="true"
        className={cn("mt-px size-1.5 shrink-0 rounded-full", palette.dot)}
      />
      <span
        className={cn(
          "min-w-0",
          isCompact ? "truncate" : "whitespace-normal break-words"
        )}
      >
        {meta.label}
      </span>
    </span>
  )
}
