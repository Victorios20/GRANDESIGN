import { StatusFinanceiro } from "@prisma/client"
import { resolveReversalStatus } from "@/lib/financial/reversal-status"

let passed = 0
let failed = 0

function check(name: string, got: StatusFinanceiro, expected: StatusFinanceiro) {
    if (got === expected) {
        passed++
        console.log(`  ✅ ${name}`)
    } else {
        failed++
        console.log(`  ❌ ${name} — esperado ${expected}, obtido ${got}`)
    }
}

const hoje = new Date("2026-06-29T00:00:00Z")
const vencido = new Date("2026-01-01T00:00:00Z")
const aVencer = new Date("2026-12-31T00:00:00Z")

console.log("🧪 resolveReversalStatus")

// O bug: conta CANCELADA deve permanecer CANCELADA ao reverter/excluir lançamentos.
check(
    "cancelada permanece cancelada (saldo zera)",
    resolveReversalStatus({ currentStatus: StatusFinanceiro.CANCELADO, newAmount: 0, valorTotal: 100, dataVencimento: aVencer, now: hoje }),
    StatusFinanceiro.CANCELADO,
)
check(
    "cancelada permanece cancelada (ainda há saldo parcial)",
    resolveReversalStatus({ currentStatus: StatusFinanceiro.CANCELADO, newAmount: 40, valorTotal: 100, dataVencimento: vencido, now: hoje }),
    StatusFinanceiro.CANCELADO,
)

// Comportamento normal (não cancelada) deve continuar valendo.
check(
    "paga parcialmente -> PARCIAL",
    resolveReversalStatus({ currentStatus: StatusFinanceiro.PAGO, newAmount: 40, valorTotal: 100, dataVencimento: aVencer, now: hoje }),
    StatusFinanceiro.PARCIAL,
)
check(
    "zera e ainda no prazo -> PENDENTE",
    resolveReversalStatus({ currentStatus: StatusFinanceiro.PAGO, newAmount: 0, valorTotal: 100, dataVencimento: aVencer, now: hoje }),
    StatusFinanceiro.PENDENTE,
)
check(
    "zera e vencida -> ATRASADO",
    resolveReversalStatus({ currentStatus: StatusFinanceiro.PAGO, newAmount: 0, valorTotal: 100, dataVencimento: vencido, now: hoje }),
    StatusFinanceiro.ATRASADO,
)

console.log(`\n${passed} passou, ${failed} falhou`)
if (failed > 0) process.exit(1)
