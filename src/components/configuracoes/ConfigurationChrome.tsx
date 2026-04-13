"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { operationalListShellClass } from "@/components/ui/operational-list-styles"

type ConfigurationPageIntroProps = {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

type ConfigurationMetricCardProps = {
  label: string
  value: string
  helper?: string
  icon: LucideIcon
}

type ConfigurationModuleCardProps = {
  href: string
  badge: string
  title: string
  description: string
  helper: string
  icon: LucideIcon
}

type ConfigurationSectionCardProps = {
  children: ReactNode
  className?: string
}

export function ConfigurationPageIntro({
  eyebrow,
  title,
  description,
  actions,
  className,
}: ConfigurationPageIntroProps) {
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2C201B]/10 bg-[#FFFCF7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2C201B]/52">
          {eyebrow}
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#2C201B]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[#2C201B]/62">
            {description}
          </p>
        </div>
      </div>

      {actions ? <div className="flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </div>
  )
}

export function ConfigurationMetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: ConfigurationMetricCardProps) {
  return (
    <Card className={cn(operationalListShellClass)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/45">
              {label}
            </p>
            <p className="text-lg font-semibold text-[#2C201B]">{value}</p>
            {helper ? <p className="text-sm leading-6 text-[#2C201B]/58">{helper}</p> : null}
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2C201B]/8 bg-[#FAF3E0]">
            <Icon className="size-5 text-[#393316]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ConfigurationModuleCard({
  href,
  badge,
  title,
  description,
  helper,
  icon: Icon,
}: ConfigurationModuleCardProps) {
  return (
    <Card
      className={cn(
        operationalListShellClass,
        "group h-full overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
      )}
    >
      <Link href={href} className="flex h-full">
        <CardContent className="flex h-full w-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="inline-flex items-center rounded-full border border-[#2C201B]/10 bg-[#FAF3E0] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#393316]">
                {badge}
              </p>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-[#2C201B]">
                  {title}
                </h2>
                <p className="text-sm leading-6 text-[#5f584c]">
                  {description}
                </p>
              </div>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2C201B]/8 bg-[#FAF3E0] text-[#393316]">
              <Icon className="size-5" />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[#7b705f]">
            <span>{helper}</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

export function ConfigurationSectionCard({ children, className }: ConfigurationSectionCardProps) {
  return (
    <Card className={cn(operationalListShellClass, className)}>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}
