"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"

type MoneyInputProps = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange"> & {
    value?: number | null
    onValueChange: (value: number | null) => void
}

function formatIntegerDigits(value: string) {
    const normalized = value.replace(/^0+(?=\d)/, "") || "0"
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function toMoneyRawValue(value?: number | null) {
    if (value == null || Number.isNaN(value)) return ""

    const [integerPart, decimalPart] = value.toFixed(2).split(".")
    if (decimalPart === "00") return integerPart
    if (decimalPart.endsWith("0")) return `${integerPart},${decimalPart[0]}`
    return `${integerPart},${decimalPart}`
}

function normalizeMoneyInput(raw: string) {
    const sanitized = raw
        .replace(/\s/g, "")
        .replace(/^R\$/i, "")
        .replace(/-/g, "")
        .replace(/[^\d.,]/g, "")

    if (!sanitized) return ""

    const lastComma = sanitized.lastIndexOf(",")
    const lastDot = sanitized.lastIndexOf(".")
    const separatorIndex = Math.max(lastComma, lastDot)

    if (separatorIndex < 0) {
        return sanitized.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
    }

    const integerDigits = sanitized.slice(0, separatorIndex).replace(/\D/g, "").replace(/^0+(?=\d)/, "")
    const decimalDigits = sanitized.slice(separatorIndex + 1).replace(/\D/g, "")
    const hasTrailingSeparator = separatorIndex === sanitized.length - 1

    if (hasTrailingSeparator) {
        return `${integerDigits || "0"},`
    }

    if (decimalDigits.length > 2) {
        return sanitized.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
    }

    if (!decimalDigits) {
        return integerDigits || "0"
    }

    return `${integerDigits || "0"},${decimalDigits}`
}

function parseMoneyRawValue(raw: string) {
    if (!raw) return null

    const [integerPart = "0", decimalPart = ""] = raw.split(",")
    const normalizedInteger = integerPart.replace(/\D/g, "") || "0"
    const normalizedDecimal = decimalPart.replace(/\D/g, "").slice(0, 2).padEnd(2, "0")
    const parsed = Number(`${normalizedInteger}.${normalizedDecimal}`)

    return Number.isFinite(parsed) ? parsed : null
}

function formatMoneyEditingValue(raw: string) {
    if (!raw) return ""

    const hasTrailingSeparator = raw.endsWith(",")
    const [integerPart = "0", decimalPart = ""] = raw.split(",")
    const formattedInteger = formatIntegerDigits(integerPart)

    if (hasTrailingSeparator) return `R$ ${formattedInteger},`
    if (!decimalPart) return `R$ ${formattedInteger}`
    return `R$ ${formattedInteger},${decimalPart}`
}

function formatMoneyDisplayValue(value?: number | null) {
    if (value == null || Number.isNaN(value)) return ""

    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    })
}

export function MoneyInput({ value = null, onValueChange, inputMode = "decimal", onBlur, onFocus, ...props }: MoneyInputProps) {
    const [isFocused, setIsFocused] = useState(false)
    const [rawValue, setRawValue] = useState(() => toMoneyRawValue(value))

    useEffect(() => {
        if (!isFocused) {
            setRawValue(toMoneyRawValue(value))
        }
    }, [isFocused, value])

    const displayValue = useMemo(
        () => (isFocused ? formatMoneyEditingValue(rawValue) : formatMoneyDisplayValue(value)),
        [isFocused, rawValue, value]
    )

    return (
        <Input
            {...props}
            type="text"
            inputMode={inputMode}
            value={displayValue}
            onChange={(event) => {
                const nextRawValue = normalizeMoneyInput(event.target.value)
                setRawValue(nextRawValue)
                onValueChange(parseMoneyRawValue(nextRawValue))
            }}
            onFocus={(event) => {
                setIsFocused(true)
                onFocus?.(event)
            }}
            onBlur={(event) => {
                setRawValue(toMoneyRawValue(parseMoneyRawValue(rawValue)))
                setIsFocused(false)
                onBlur?.(event)
            }}
        />
    )
}
