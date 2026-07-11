import assert from "node:assert/strict"

import { StatusFinanceiro } from "@prisma/client"

import {
    resolveFinancialStatusFromAmounts,
    resolvePayablePaymentState,
} from "../src/actions/financeiro/shared/open-status"
import {
    calculateAmortizedAmount,
    calculateCashPaymentAmount,
    isLessMoneyAmount,
} from "../src/lib/financial/money"

const dueDate = new Date("2999-01-01T12:00:00.000Z")

assert.equal(
    resolveFinancialStatusFromAmounts({
        currentStatus: StatusFinanceiro.PARCIAL,
        total: 1_720,
        paid: 1_720,
        dueDate,
    }),
    StatusFinanceiro.PAGO,
)

assert.equal(
    resolveFinancialStatusFromAmounts({
        currentStatus: StatusFinanceiro.PENDENTE,
        total: 1_720,
        paid: 1_000,
        dueDate,
    }),
    StatusFinanceiro.PARCIAL,
)

assert.equal(
    resolveFinancialStatusFromAmounts({
        currentStatus: StatusFinanceiro.CANCELADO,
        total: 1_720,
        paid: 1_720,
        dueDate,
    }),
    StatusFinanceiro.CANCELADO,
)

const partialPayment = resolvePayablePaymentState({
    currentStatus: StatusFinanceiro.PENDENTE,
    total: 1_720,
    paid: 0,
    amortized: 1_000,
    dueDate,
    adjustTotal: false,
})
assert.deepEqual(partialPayment, {
    newPaid: 1_000,
    newTotal: 1_720,
    status: StatusFinanceiro.PARCIAL,
})

const adjustedPayment = resolvePayablePaymentState({
    currentStatus: StatusFinanceiro.PENDENTE,
    total: 1_720,
    paid: 0,
    amortized: 1_000,
    dueDate,
    adjustTotal: true,
})
assert.deepEqual(adjustedPayment, {
    newPaid: 1_000,
    newTotal: 1_000,
    status: StatusFinanceiro.PAGO,
})

assert.equal(isLessMoneyAmount(1_719.99, 1_720), true)
assert.equal(calculateCashPaymentAmount(1_000, 100, 0), 1_100)
assert.equal(calculateAmortizedAmount(1_100, 100, 0), 1_000)
assert.equal(calculateCashPaymentAmount(1_000, 0, 100), 900)
assert.equal(calculateAmortizedAmount(900, 0, 100), 1_000)

console.log("payable status rules: ok")
