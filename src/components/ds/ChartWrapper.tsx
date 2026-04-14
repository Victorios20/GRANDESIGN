/**
 * GRANDESIGN Design System — ChartWrapper
 *
 * Wrapper para gráficos Recharts que injeta automaticamente:
 * - Paleta de cores DS (terrosa, coerente com brand.md)
 * - Tipografia para eixos (text-muted, 11px)
 * - Estilo de grid e tooltip padronizado
 *
 * Importar DS.chart.tick, DS.chart.grid e DS.chart.tooltip nos
 * seus gráficos para manter consistência sem precisar repetir config.
 */

"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { DS } from "@/lib/ds-tokens"
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

// ── Presets de config Recharts (use com spread) ───────────────────────────────

/** Props padrão para <CartesianGrid> */
export const dsGridProps = {
  stroke:          DS.chart.grid.stroke,
  strokeDasharray: DS.chart.grid.strokeDasharray,
  vertical:        false,
} as const

/** Props padrão para <XAxis> */
export const dsXAxisProps = {
  tick:       DS.chart.tick,
  axisLine:   false,
  tickLine:   false,
  tickMargin: 8,
} as const

/** Props padrão para <YAxis> */
export const dsYAxisProps = {
  tick:       DS.chart.tick,
  axisLine:   false,
  tickLine:   false,
  width:      40,
} as const

/** Props padrão para <Tooltip> */
export const dsTooltipProps = {
  contentStyle:    DS.chart.tooltip.contentStyle,
  itemStyle:       DS.chart.tooltip.itemStyle,
  labelStyle:      DS.chart.tooltip.labelStyle,
  cursor:          { fill: "rgba(57,51,22,0.04)" },
  animationEasing: "ease-out" as const,
} as const

// ── ChartWrapper ───────────────────────────────────────────────────────────────

interface ChartWrapperProps {
  /** Altura fixa ou "auto" */
  height?: number | `${number}%`
  /** Se true, adiciona título/card shell ao redor do gráfico */
  title?: string
  description?: string
  className?: string
  children: React.ReactNode
}

/**
 * Envolve qualquer gráfico Recharts em ResponsiveContainer
 * com o card shell do DS e altura padrão.
 *
 * @example
 * <ChartWrapper title="Fluxo de Caixa" height={280}>
 *   <BarChart data={data}>
 *     <CartesianGrid {...dsGridProps} />
 *     <XAxis {...dsXAxisProps} dataKey="mes" />
 *     <YAxis {...dsYAxisProps} />
 *     <Tooltip {...dsTooltipProps} />
 *     <Bar dataKey="valor" fill={DS.colors.chart[0]} radius={[4,4,0,0]} />
 *   </BarChart>
 * </ChartWrapper>
 */
export function ChartWrapper({
  height = 280,
  title,
  description,
  className,
  children,
}: ChartWrapperProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#e8e1d6] bg-white",
        "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      {(title || description) && (
        <div className="px-5 py-4 border-b border-[#e8e1d6]">
          {title && (
            <p className="text-sm font-semibold text-[#2c201b]">{title}</p>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-[#7b705f]">{description}</p>
          )}
        </div>
      )}

      <div className="p-4">
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── DSChartColors helper ──────────────────────────────────────────────────────

/**
 * Retorna a cor DS pelo índice (circular).
 * @example fill={getDSColor(0)} // "#8B5E3C"
 */
export function getDSColor(index: number): string {
  return DS.colors.chart[index % DS.colors.chart.length]
}
