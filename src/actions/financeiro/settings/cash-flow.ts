import { Prisma } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import type { CashFlowSettings } from "@/types/financeiro"

export const DEFAULT_CASH_FLOW_SAFETY_LIMIT = 10000
const CASH_FLOW_SETTINGS_ID = 1

export const cashFlowSettingsSchema = z.object({
    safety_limit: z.coerce.number().finite().min(0),
    closing_date: z.coerce.date().nullable().optional(),
})

function toSettings(value: number, closingDate?: Date | null): CashFlowSettings {
    return {
        safety_limit: Number(value.toFixed(2)),
        closing_date: closingDate ? closingDate.toISOString() : null,
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
            "data_fechamento" DATE,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "fluxo_caixa_parametros_pkey" PRIMARY KEY ("id")
        )
    `)
}

async function ensureCashFlowSettingsColumns() {
    await ensureCashFlowSettingsTable()
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "public"."fluxo_caixa_parametros"
        ADD COLUMN IF NOT EXISTS "data_fechamento" DATE
    `)
}

export async function getCashFlowSettings(): Promise<CashFlowSettings> {
    try {
        await ensureCashFlowSettingsColumns()

        const settings = await prisma.fluxoCaixaParametro.findUnique({
            where: { id: CASH_FLOW_SETTINGS_ID },
        })

        return toSettings(
            Number(settings?.limite_alerta ?? DEFAULT_CASH_FLOW_SAFETY_LIMIT),
            settings?.data_fechamento ?? null
        )
    } catch (error) {
        if (isMissingCashFlowSettingsTable(error)) {
            await ensureCashFlowSettingsColumns()
            return toSettings(DEFAULT_CASH_FLOW_SAFETY_LIMIT, null)
        }

        throw error
    }
}

export async function updateCashFlowSettings(input: unknown, userId?: number): Promise<CashFlowSettings> {
    const data = cashFlowSettingsSchema.parse(input)

    try {
        const previous = await prisma.fluxoCaixaParametro.findUnique({
            where: { id: CASH_FLOW_SETTINGS_ID },
        })

        const settings = await prisma.fluxoCaixaParametro.upsert({
            where: { id: CASH_FLOW_SETTINGS_ID },
            create: {
                id: CASH_FLOW_SETTINGS_ID,
                limite_alerta: data.safety_limit,
                data_fechamento: data.closing_date ?? null,
            },
            update: {
                limite_alerta: data.safety_limit,
                data_fechamento: data.closing_date ?? null,
            },
        })

        if (userId) {
            await prisma.auditLog.create({
                data: {
                    action: "CASH_FLOW_SETTINGS_UPDATED",
                    entity: "fluxo_caixa_parametros",
                    entity_id: settings.id,
                    user_id: userId,
                    detail: {
                        previous: previous
                            ? {
                                safety_limit: Number(previous.limite_alerta),
                                closing_date: previous.data_fechamento?.toISOString() ?? null,
                            }
                            : null,
                        current: {
                            safety_limit: Number(settings.limite_alerta),
                            closing_date: settings.data_fechamento?.toISOString() ?? null,
                        },
                    },
                },
            })
        }

        return toSettings(Number(settings.limite_alerta), settings.data_fechamento)
    } catch (error) {
        if (!isMissingCashFlowSettingsTable(error)) {
            throw error
        }

        await ensureCashFlowSettingsColumns()

        const previous = await prisma.fluxoCaixaParametro.findUnique({
            where: { id: CASH_FLOW_SETTINGS_ID },
        })

        const settings = await prisma.fluxoCaixaParametro.upsert({
            where: { id: CASH_FLOW_SETTINGS_ID },
            create: {
                id: CASH_FLOW_SETTINGS_ID,
                limite_alerta: data.safety_limit,
                data_fechamento: data.closing_date ?? null,
            },
            update: {
                limite_alerta: data.safety_limit,
                data_fechamento: data.closing_date ?? null,
            },
        })

        if (userId) {
            await prisma.auditLog.create({
                data: {
                    action: "CASH_FLOW_SETTINGS_UPDATED",
                    entity: "fluxo_caixa_parametros",
                    entity_id: settings.id,
                    user_id: userId,
                    detail: {
                        previous: previous
                            ? {
                                safety_limit: Number(previous.limite_alerta),
                                closing_date: previous.data_fechamento?.toISOString() ?? null,
                            }
                            : null,
                        current: {
                            safety_limit: Number(settings.limite_alerta),
                            closing_date: settings.data_fechamento?.toISOString() ?? null,
                        },
                    },
                },
            })
        }

        return toSettings(Number(settings.limite_alerta), settings.data_fechamento)
    }
}
