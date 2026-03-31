import { Prisma } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import type { CashFlowSettings } from "@/types/financeiro"

export const DEFAULT_CASH_FLOW_SAFETY_LIMIT = 10000
const CASH_FLOW_SETTINGS_ID = 1

export const cashFlowSettingsSchema = z.object({
    safety_limit: z.coerce.number().finite().min(0),
})

function toSettings(value: number): CashFlowSettings {
    return {
        safety_limit: Number(value.toFixed(2)),
    }
}

function isMissingCashFlowSettingsTable(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2021" &&
        String(error.meta?.table ?? "").includes("fluxo_caixa_parametros")
    )
}

async function ensureCashFlowSettingsTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "public"."fluxo_caixa_parametros" (
            "id" INTEGER NOT NULL,
            "limite_alerta" DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "fluxo_caixa_parametros_pkey" PRIMARY KEY ("id")
        )
    `)
}

export async function getCashFlowSettings(): Promise<CashFlowSettings> {
    try {
        const settings = await prisma.fluxoCaixaParametro.findUnique({
            where: { id: CASH_FLOW_SETTINGS_ID },
        })

        return toSettings(Number(settings?.limite_alerta ?? DEFAULT_CASH_FLOW_SAFETY_LIMIT))
    } catch (error) {
        if (isMissingCashFlowSettingsTable(error)) {
            return toSettings(DEFAULT_CASH_FLOW_SAFETY_LIMIT)
        }

        throw error
    }
}

export async function updateCashFlowSettings(input: unknown): Promise<CashFlowSettings> {
    const data = cashFlowSettingsSchema.parse(input)

    try {
        const settings = await prisma.fluxoCaixaParametro.upsert({
            where: { id: CASH_FLOW_SETTINGS_ID },
            create: {
                id: CASH_FLOW_SETTINGS_ID,
                limite_alerta: data.safety_limit,
            },
            update: {
                limite_alerta: data.safety_limit,
            },
        })

        return toSettings(Number(settings.limite_alerta))
    } catch (error) {
        if (!isMissingCashFlowSettingsTable(error)) {
            throw error
        }

        await ensureCashFlowSettingsTable()

        const settings = await prisma.fluxoCaixaParametro.upsert({
            where: { id: CASH_FLOW_SETTINGS_ID },
            create: {
                id: CASH_FLOW_SETTINGS_ID,
                limite_alerta: data.safety_limit,
            },
            update: {
                limite_alerta: data.safety_limit,
            },
        })

        return toSettings(Number(settings.limite_alerta))
    }
}
