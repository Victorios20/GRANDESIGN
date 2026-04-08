"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    buildDashboardSearchParams,
    DASHBOARD_EXPENSE_SCOPE_OPTIONS,
    getDashboardExpenseScopeLabel,
} from "@/lib/financeiro-dashboard"
import { formatCurrency } from "@/lib/financeiro-utils"
import { cn } from "@/lib/utils"
import type {
    DashboardAppliedFilters,
    DashboardExpenseCategoryDetail,
    DashboardExpenseScope,
    DashboardSummary,
    DashboardTopExpenseItem,
} from "@/types/financeiro"

interface TopExpensesCardProps {
    data: DashboardSummary["top_expenses"]
    filters: DashboardAppliedFilters
}

interface DonutChartItem extends DashboardTopExpenseItem {
    displayColor: string
}

interface ActiveDonutShapeProps {
    cx?: number
    cy?: number
    innerRadius?: number
    outerRadius?: number
    startAngle?: number
    endAngle?: number
    fill?: string
}

interface DefaultDonutShapeProps extends ActiveDonutShapeProps {
    cornerRadius?: number
}

const DONUT_FALLBACK_COLORS = ["#B66A61", "#C4846B", "#D5A15F", "#9E7867", "#C48B79", "#D8B37D", "#B39A86", "#A96E66"]

function getDetailKey(scope: DashboardExpenseScope, categoryId: number) {
    return `${scope}:${categoryId}`
}

function ActiveDonutShape({
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = "#B66A61",
}: ActiveDonutShapeProps) {
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 2}
                outerRadius={outerRadius + 7}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                fillOpacity={0.14}
            />
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 3}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
        </g>
    )
}

function DefaultDonutShape({
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = "#B66A61",
    cornerRadius,
}: DefaultDonutShapeProps) {
    return (
        <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
            cornerRadius={cornerRadius}
        />
    )
}

function DonutTooltip({
    active,
    payload,
}: {
    active?: boolean
    payload?: Array<{
        payload?: DonutChartItem
    }>
}) {
    const item = payload?.[0]?.payload

    if (!active || !item) return null

    return (
        <div className="max-w-[240px] rounded-xl border border-[#E8E1D6] bg-[#FFFCF7] px-3 py-2.5 text-sm shadow-[0_12px_24px_rgba(44,32,27,0.12)]">
            <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: item.displayColor }} />
                <p className="truncate whitespace-nowrap font-medium text-[#8C6A5D]">{item.nome}</p>
            </div>
            <p className="mt-1.5 font-semibold text-[#2C201B]">{formatCurrency(item.total)}</p>
            <p className="mt-1 text-[11px] text-[#6F6556]">
                {item.percentual_total.toFixed(1).replace(".", ",")}% do total
                {" • "}
                {item.lancamentos_count} lançamento(s)
            </p>
        </div>
    )
}

export function TopExpensesCard({ data, filters }: TopExpensesCardProps) {
    const [activeScope, setActiveScope] = useState<DashboardExpenseScope>(data.scope)
    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
    const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null)
    const [summaries, setSummaries] = useState<Record<DashboardExpenseScope, DashboardSummary["top_expenses"]>>({
        [data.scope]: data,
    } as Record<DashboardExpenseScope, DashboardSummary["top_expenses"]>)
    const [details, setDetails] = useState<Record<string, DashboardExpenseCategoryDetail>>({})
    const [loadingCategoryKey, setLoadingCategoryKey] = useState<string | null>(null)
    const [loadingScope, setLoadingScope] = useState<DashboardExpenseScope | null>(null)
    const queryBase = useMemo(() => buildDashboardSearchParams(filters).toString(), [filters])
    const currentSummary = summaries[activeScope] ?? data
    const currentItems = useMemo(
        () =>
            [...currentSummary.items]
                .sort((left, right) => right.total - left.total)
                .map((item, index) => ({
                    ...item,
                    displayColor: item.cor || DONUT_FALLBACK_COLORS[index % DONUT_FALLBACK_COLORS.length],
                })),
        [currentSummary.items],
    )
    const activeIndex = currentItems.findIndex((item) => item.categoria_id === activeCategoryId)
    const renderDonutShape = (props: PieSectorShapeProps, index: number) => {
        if (index === activeIndex) {
            return <ActiveDonutShape {...props} />
        }

        return <DefaultDonutShape {...props} />
    }

    useEffect(() => {
        setActiveScope(data.scope)
        setActiveCategoryId(null)
        setExpandedCategoryId(null)
        setSummaries({
            [data.scope]: data,
        } as Record<DashboardExpenseScope, DashboardSummary["top_expenses"]>)
        setDetails({})
        setLoadingCategoryKey(null)
        setLoadingScope(null)
    }, [data])

    async function handleScopeChange(scope: DashboardExpenseScope) {
        if (scope === activeScope) return

        setActiveScope(scope)
        setActiveCategoryId(null)
        setExpandedCategoryId(null)

        if (summaries[scope]) {
            return
        }

        setLoadingScope(scope)

        try {
            const response = await fetch(`/api/financeiro/reports/dashboard-top-expenses?${queryBase}&scope=${scope}`, {
                cache: "no-store",
            })

            if (!response.ok) {
                throw new Error("Falha ao carregar ranking.")
            }

            const payload = (await response.json()) as DashboardSummary["top_expenses"]
            setSummaries((current) => ({ ...current, [scope]: payload }))
        } finally {
            setLoadingScope(null)
        }
    }

    async function handleToggle(item: DashboardTopExpenseItem) {
        const detailKey = getDetailKey(activeScope, item.categoria_id)
        const isOpen = expandedCategoryId === item.categoria_id

        setActiveCategoryId(item.categoria_id)

        if (isOpen) {
            setExpandedCategoryId(null)
            return
        }

        setExpandedCategoryId(item.categoria_id)
        if (details[detailKey]) {
            return
        }

        setLoadingCategoryKey(detailKey)

        try {
            const response = await fetch(
                `/api/financeiro/reports/dashboard-expense-category-detail?${queryBase}&scope=${activeScope}&category_id=${item.categoria_id}`,
                { cache: "no-store" },
            )

            if (!response.ok) {
                throw new Error("Falha ao carregar categoria.")
            }

            const payload = (await response.json()) as DashboardExpenseCategoryDetail
            setDetails((current) => ({ ...current, [detailKey]: payload }))
        } catch {
            setDetails((current) => ({
                ...current,
                [detailKey]: {
                    title: item.nome,
                    subtitle: "",
                    scope: activeScope,
                    category: {
                        categoria_id: item.categoria_id,
                        nome: item.nome,
                        total: item.total,
                        percentual_total: item.percentual_total,
                    },
                    suppliers: [],
                    latest_items: [],
                    cta_label: "Abrir análise",
                    cta_href: "/lancamentos",
                },
            }))
        } finally {
            setLoadingCategoryKey(null)
        }
    }

    return (
        <Card className="border-[#E8E1D6] bg-[#FFFCF7] py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CardHeader className="border-b border-[#EFE8DC] px-4 py-3">
                <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold text-[#2C201B]">{currentSummary.title}</CardTitle>
                            <CardDescription className="text-xs text-[#6F6556]">{currentSummary.subtitle}</CardDescription>
                        </div>

                        <div className="inline-flex rounded-xl border border-[#D9D3C8] bg-[#F7F4ED] p-1">
                            {DASHBOARD_EXPENSE_SCOPE_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => handleScopeChange(option.key)}
                                    className={cn(
                                        "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                        activeScope === option.key
                                            ? "bg-white text-[#2C201B] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                                            : "text-[#6F6556] hover:text-[#2C201B]",
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A7D69]">
                        {getDashboardExpenseScopeLabel(activeScope)}
                    </p>
                </div>
            </CardHeader>

            <CardContent className="px-4 py-2.5">
                {loadingScope ? (
                    <div className="flex min-h-[248px] items-center justify-center rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 text-center text-sm text-[#6F6556]">
                        Atualizando ranking...
                    </div>
                ) : currentItems.length === 0 ? (
                    <div className="flex min-h-[248px] items-center justify-center rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 text-center text-sm text-[#6F6556]">
                        Nenhum registro relevante para {activeScope === "cost" ? "custos" : "despesas"} no período.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <div className="relative mx-auto h-[156px] w-full max-w-[260px] sm:h-[164px] sm:max-w-[276px] lg:h-[172px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={currentItems}
                                        dataKey="total"
                                        nameKey="nome"
                                        cx="50%"
                                        cy="50%"
                                        startAngle={90}
                                        endAngle={-270}
                                        innerRadius={49}
                                        outerRadius={72}
                                        paddingAngle={2}
                                        cornerRadius={3}
                                        stroke="none"
                                        shape={renderDonutShape}
                                        onMouseEnter={(_, index) => setActiveCategoryId(currentItems[index]?.categoria_id ?? null)}
                                        onMouseLeave={() => setActiveCategoryId(null)}
                                        onClick={(_, index) => {
                                            const selectedItem = currentItems[index]
                                            if (selectedItem) {
                                                void handleToggle(selectedItem)
                                            }
                                        }}
                                    >
                                        {currentItems.map((item) => (
                                            <Cell key={`${activeScope}-${item.categoria_id}`} fill={item.displayColor} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={<DonutTooltip />}
                                        cursor={false}
                                        wrapperStyle={{ zIndex: 20, outline: "none" }}
                                        position={{ x: 18, y: 18 }}
                                        allowEscapeViewBox={{ x: true, y: true }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7C705F]">Total</span>
                                <span className="mt-1.5 text-base font-semibold text-[#2C201B]">
                                    {formatCurrency(currentSummary.total_despesas)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            {currentItems.map((item) => {
                                const detailKey = getDetailKey(activeScope, item.categoria_id)
                                const isExpanded = expandedCategoryId === item.categoria_id
                                const isActive = activeCategoryId === item.categoria_id
                                const detail = details[detailKey]
                                const isLoading = loadingCategoryKey === detailKey

                                return (
                                    <div
                                        key={`${activeScope}-${item.categoria_id}`}
                                        className={cn(
                                            "rounded-xl border border-[#E8E1D6] bg-white transition-[border-color,box-shadow,background-color]",
                                            (isActive || isExpanded) &&
                                                "border-[#D7C8B6] bg-[#FFFDFC] shadow-[0_6px_18px_rgba(44,32,27,0.06)]",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(item)}
                                            onMouseEnter={() => setActiveCategoryId(item.categoria_id)}
                                            onMouseLeave={() => setActiveCategoryId(null)}
                                            onFocus={() => setActiveCategoryId(item.categoria_id)}
                                            onBlur={() => setActiveCategoryId(null)}
                                            className={cn(
                                                "grid w-full gap-1.5 px-3 py-2 text-left transition-colors md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-3",
                                                isActive || isExpanded ? "bg-[#FFFDFC]" : "hover:bg-[#FAF8F4]",
                                            )}
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <span
                                                    className="size-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: item.displayColor }}
                                                />
                                                <p className="truncate text-sm font-semibold text-[#2C201B]">{item.nome}</p>
                                            </div>

                                            <div className="flex min-w-0 items-center justify-between gap-3 md:shrink-0 md:justify-end">
                                                <p className="text-[11px] font-medium text-[#6F6556] sm:text-xs">
                                                    <span className="font-semibold text-[#2C201B]">{formatCurrency(item.total)}</span>
                                                    {" • "}
                                                    {item.percentual_total.toFixed(1).replace(".", ",")}%
                                                    {" • "}
                                                    <span className="text-[#8A7D69]">{item.lancamentos_count}</span>
                                                </p>
                                                {isExpanded ? (
                                                    <ChevronDown
                                                        className="size-4"
                                                        style={{ color: isActive || isExpanded ? item.displayColor : "#9A8F7C" }}
                                                    />
                                                ) : (
                                                    <ChevronRight
                                                        className="size-4"
                                                        style={{ color: isActive || isExpanded ? item.displayColor : "#9A8F7C" }}
                                                    />
                                                )}
                                            </div>
                                        </button>

                                        {isExpanded ? (
                                            <div className="border-t border-[#EFE8DC] px-3 py-2.5">
                                                {isLoading ? (
                                                    <p className="text-xs text-[#6F6556]">Carregando fornecedores...</p>
                                                ) : detail?.suppliers.length ? (
                                                    <div className="space-y-2">
                                                        {detail.suppliers.slice(0, 4).map((supplier) => (
                                                            <div
                                                                key={`${supplier.supplier_id ?? "none"}-${supplier.nome}`}
                                                                className="flex items-center justify-between gap-3 rounded-lg bg-[#F7F4ED] px-2.5 py-2"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-xs font-medium text-[#2C201B]">{supplier.nome}</p>
                                                                    <p className="mt-0.5 text-[11px] text-[#6F6556]">
                                                                        {supplier.lancamentos_count} lançamento(s)
                                                                    </p>
                                                                </div>
                                                                <p className="text-xs font-semibold text-[#2C201B]">
                                                                    {formatCurrency(supplier.total)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                        <Link
                                                            href={detail.cta_href}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-[#6F6556] transition-colors hover:text-[#2C201B]"
                                                        >
                                                            Abrir análise
                                                            <ExternalLink className="size-3.5" />
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-[#6F6556]">Sem fornecedores consolidados.</p>
                                                        <Link
                                                            href={detail?.cta_href ?? "/lancamentos"}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-[#6F6556] transition-colors hover:text-[#2C201B]"
                                                        >
                                                            Abrir análise
                                                            <ExternalLink className="size-3.5" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
