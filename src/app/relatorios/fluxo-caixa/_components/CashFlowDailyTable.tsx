import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export function CashFlowDailyTable({ data }: Props) {
    const rows = buildCashFlowChartData(data)

    return (
        <Card className="overflow-hidden rounded-2xl border border-[rgba(44,32,27,0.08)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <CardHeader className="space-y-1 border-b border-[rgba(44,32,27,0.08)] pb-4">
                <CardTitle className="text-lg font-semibold text-[#2c201b]">
                    Leitura diaria
                </CardTitle>
                <p className="text-sm leading-6 text-[rgba(44,32,27,0.68)]">
                    Serie por data com saldo do dia, saldo acumulado e status financeiro.
                </p>
            </CardHeader>

            <CardContent className="p-0">
                <div className="max-h-[560px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-[#FAF3E0] shadow-[0_1px_0_rgba(44,32,27,0.08)]">
                            <TableRow className="border-[rgba(44,32,27,0.08)] hover:bg-transparent">
                                <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Data
                                </TableHead>
                                <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Dia
                                </TableHead>
                                <TableHead className="px-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Entradas
                                </TableHead>
                                <TableHead className="px-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Saidas
                                </TableHead>
                                <TableHead className="px-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Saldo do dia
                                </TableHead>
                                <TableHead className="px-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Saldo acumulado
                                </TableHead>
                                <TableHead className="px-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Status
                                </TableHead>
                                <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Observacao
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.date} className={getCashFlowRowClasses(row.status)}>
                                    <TableCell className="px-4 py-3 font-medium text-[#2c201b]">
                                        {row.shortDate}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-[rgba(44,32,27,0.68)]">
                                        {row.shortWeekday}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right font-medium text-[#2c201b]">
                                        {row.entradas_previstas > 0 ? formatCurrency(row.entradas_previstas) : "--"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right font-medium text-[#2c201b]">
                                        {row.saidas_previstas > 0 ? formatCurrency(row.saidas_previstas) : "--"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right font-medium text-[#2c201b]">
                                        {formatCurrency(row.saldo_dia)}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right font-semibold text-[#2c201b]">
                                        {formatCurrency(row.saldo_final)}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-center">
                                        <CashFlowStatusBadge status={row.status} />
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-[rgba(44,32,27,0.68)]">
                                        {row.observation}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
