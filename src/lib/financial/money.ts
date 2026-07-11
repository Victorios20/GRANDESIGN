export function toMoneyCents(value: number) {
    return Math.round(value * 100)
}

export function isSameMoneyAmount(left: number, right: number) {
    return toMoneyCents(left) === toMoneyCents(right)
}

export function isLessMoneyAmount(left: number, right: number) {
    return toMoneyCents(left) < toMoneyCents(right)
}

export function isGreaterMoneyAmount(left: number, right: number) {
    return toMoneyCents(left) > toMoneyCents(right)
}

export function calculateCashPaymentAmount(principal: number, interest: number, discount: number) {
    return principal + interest - discount
}

export function calculateAmortizedAmount(cashPayment: number, interest: number, discount: number) {
    return cashPayment + discount - interest
}
