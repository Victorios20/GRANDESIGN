"use client"

import { ChevronDown, Landmark } from "lucide-react"

import { formatCurrency } from "@/lib/financeiro-utils"
import {
    operationalListShellClass,
    operationalListSubtlePanelClass,
} from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"
import type { BankOption } from "@/types/financeiro"

interface AccountBalanceStripProps {
    banks: BankOption[]
    selectedBankId: string
    onSelectBank: (value: string) => void
    collapsed: boolean
    onToggle: () => void
    selectedBankReview?: {
        pendingCount: number
        reviewStateLabel: string
    } | null
}

export function AccountBalanceStrip({
    banks,
    selectedBankId,
    onSelectBank,
    collapsed,
    onToggle,
    selectedBankReview,
}: AccountBalanceStripProps) {
    const totalBalance = banks.reduce((total, bank) => total + Number(bank.saldo_atual), 0)
    const activeBank = banks.find((bank) => String(bank.id) === selectedBankId)
    const activeLabel = activeBank?.nome ?? "Todas as contas"
    const activeValue = activeBank ? Number(activeBank.saldo_atual) : totalBalance

    return (
        <section className={cn(operationalListShellClass, "overflow-hidden")}>
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[#faf8f4]"
                aria-expanded={!collapsed}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#2c201b]">
                        <Landmark className="size-3.5 text-[#7b705f]" />
                        <span>Saldos por conta</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#6f6556]">
                        Filtro por conta para leitura do caixa realizado e da conciliação bancária.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden text-right sm:block">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b705f]">
                            {activeLabel}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-[#2c201b]">
                            {formatCurrency(activeValue)}
                        </p>
                    </div>
                    <ChevronDown
                        className={cn("size-4 text-[#7b705f] transition-transform", !collapsed && "rotate-180")}
                    />
                </div>
            </button>

            {selectedBankId !== "all" && selectedBankReview ? (
                <div className="border-t border-[#e7e0d4] px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <MiniStat label="Conta selecionada" value={activeLabel} />
                        <MiniStat label="Pendências" value={String(selectedBankReview.pendingCount)} />
                        <MiniStat label="Estado" value={selectedBankReview.reviewStateLabel} />
                    </div>
                </div>
            ) : null}

            {!collapsed ? (
                <div className="border-t border-[#e7e0d4] px-4 py-3">
                    <div className={cn(operationalListSubtlePanelClass, "flex gap-2 overflow-x-auto p-2")}>
                        <BalancePill
                            label="Todas as contas"
                            value={formatCurrency(totalBalance)}
                            isActive={selectedBankId === "all"}
                            onClick={() => onSelectBank("all")}
                        />

                        {banks.map((bank) => (
                            <BalancePill
                                key={bank.id}
                                label={bank.nome}
                                value={formatCurrency(bank.saldo_atual)}
                                isActive={selectedBankId === String(bank.id)}
                                onClick={() => onSelectBank(String(bank.id))}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </section>
    )
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b705f]">{label}</p>
            <p className="text-sm font-semibold text-[#2c201b]">{value}</p>
        </div>
    )
}

interface BalancePillProps {
    label: string
    value: string
    isActive: boolean
    onClick: () => void
}

function BalancePill({ label, value, isActive, onClick }: BalancePillProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "min-w-[152px] rounded-lg border px-3 py-2 text-left transition-colors",
                isActive
                    ? "border-[#c9bea4] bg-white text-[#2c201b] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    : "border-[#ddd7cc] bg-[#f6f4ef] text-[#6f6556] hover:border-[#cfc8ba] hover:bg-white hover:text-[#2c201b]"
            )}
            aria-pressed={isActive}
        >
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b705f]">
                {label}
            </p>
            <p className="mt-1 text-[13px] font-semibold">{value}</p>
        </button>
    )
}
