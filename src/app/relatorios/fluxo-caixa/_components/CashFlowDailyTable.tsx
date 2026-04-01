import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { CashFlowProjectionResponse } from "@/types/financeiro"

import { CashFlowStatusBadge } from "./CashFlowStatusBadge"
import {
    buildCashFlowChartData,
    getCashFlowRowClasses,
} from "./cash-flow-view-model"

type Props = {
    data: CashFlowProjectionResponse
}

const colHead = "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]"

export function CashFlowDailyTable({ data }: Props) {
    const rows = buildCashFlowChartData(data)

    return (
        <div className="overflow-hidden rounded-2xl border border-[#e8e1d6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {/* Header do card */}
            <div className="border-b border-[#e7e0d4] bg-[#faf8f3] px-5 py-4">
                <h2 className="text-base font-semibold text-[#393316]">Leitura diária</h2>
                <p className="mt-0.5 text-xs text-[#7b705f]">
                    Série por data com saldo do dia, saldo acumulado e status financeiro.
                </p>
            </div>

            {/* Tabela */}
            <div className="max-h-[560px] overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-[#faf8f3]">
                        <TableRow className="border-b border-[#e7e0d4] hover:bg-transparent">
                            <TableHead className={colHead}>Data</TableHead>
                            <TableHead className={colHead}>Dia</TableHead>
                            <TableHead className={`${colHead} text-right`}>Entradas</TableHead>
                            <TableHead className={`${colHead} text-right`}>Saídas</TableHead>
                            <TableHead className={`${colHead} text-right`}>Saldo do dia</TableHead>
                            <TableHead className={`${colHead} text-right`}>Saldo acumulado</TableHead>
                            <TableHead className={`${colHead} text-center`}>Status</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow
                                key={row.date}
                                className={getCashFlowRowClasses(row.status)}
                            >
                                {/* Data */}
                                <TableCell className="px-4 py-3 font-medium text-[#2c201b]">
                                    {row.shortDate}
                                </TableCell>

                                {/* Dia da semana */}
                                <TableCell className="px-4 py-3 capitalize text-[#9a8f7c]">
                                    {row.shortWeekday}
                                </TableCell>

                                {/* Entradas — mono para alinhamento decimal */}
                                <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums text-[#2c201b]">
                                    {row.entradas_previstas > 0 ? formatCurrency(row.entradas_previstas) : (
                                        <span className="text-[#c5bdb3]">—</span>
                                    )}
                                </TableCell>

                                {/* Saídas */}
                                <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums text-[#2c201b]">
                                    {row.saidas_previstas > 0 ? formatCurrency(row.saidas_previstas) : (
                                        <span className="text-[#c5bdb3]">—</span>
                                    )}
                                </TableCell>

                                {/* Saldo do dia */}
                                <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums text-[#2c201b]">
                                    {formatCurrency(row.saldo_dia)}
                                </TableCell>

                                {/* Saldo acumulado — mais peso */}
                                <TableCell className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-[#393316]">
                                    {formatCurrency(row.saldo_final)}
                                </TableCell>

                                {/* Status */}
                                <TableCell className="px-4 py-3 text-center">
                                    <CashFlowStatusBadge status={row.status} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
