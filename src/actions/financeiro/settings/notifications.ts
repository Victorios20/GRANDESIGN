import { z } from "zod"

import { prisma } from "@/lib/prisma"

const NOTIFICATION_SETTINGS_ID = 1

export type EmailNotificationSettings = {
    emails: string[]
    notificar_conta_pagar: boolean
    notificar_conta_receber: boolean
    ativo: boolean
}

export const notificationSettingsSchema = z.object({
    emails: z.array(z.string().email()).max(50),
    notificar_conta_pagar: z.boolean(),
    notificar_conta_receber: z.boolean(),
    ativo: z.boolean(),
})

const DEFAULT_SETTINGS: EmailNotificationSettings = {
    emails: [],
    notificar_conta_pagar: true,
    notificar_conta_receber: true,
    ativo: true,
}

function parseEmails(raw: string | null | undefined): string[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
            return parsed.map((e) => String(e).trim()).filter(Boolean)
        }
    } catch {
        // fallback: lista separada por vírgula/; quebra de linha
        return String(raw)
            .split(/[,;\n]/)
            .map((e) => e.trim())
            .filter(Boolean)
    }
    return []
}

export async function getNotificationSettings(): Promise<EmailNotificationSettings> {
    const row = await prisma.notificacaoEmailConfig.findUnique({
        where: { id: NOTIFICATION_SETTINGS_ID },
    })

    if (!row) return DEFAULT_SETTINGS

    return {
        emails: parseEmails(row.emails_destinatarios),
        notificar_conta_pagar: row.notificar_conta_pagar,
        notificar_conta_receber: row.notificar_conta_receber,
        ativo: row.ativo,
    }
}

export async function updateNotificationSettings(
    input: unknown,
    userId?: number,
): Promise<EmailNotificationSettings> {
    const data = notificationSettingsSchema.parse(input)
    const emailsJson = JSON.stringify(Array.from(new Set(data.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))))

    const previous = await prisma.notificacaoEmailConfig.findUnique({
        where: { id: NOTIFICATION_SETTINGS_ID },
    })

    const row = await prisma.notificacaoEmailConfig.upsert({
        where: { id: NOTIFICATION_SETTINGS_ID },
        create: {
            id: NOTIFICATION_SETTINGS_ID,
            emails_destinatarios: emailsJson,
            notificar_conta_pagar: data.notificar_conta_pagar,
            notificar_conta_receber: data.notificar_conta_receber,
            ativo: data.ativo,
        },
        update: {
            emails_destinatarios: emailsJson,
            notificar_conta_pagar: data.notificar_conta_pagar,
            notificar_conta_receber: data.notificar_conta_receber,
            ativo: data.ativo,
        },
    })

    if (userId) {
        await prisma.auditLog.create({
            data: {
                action: "EMAIL_NOTIFICATION_SETTINGS_UPDATED",
                entity: "notificacao_email_config",
                entity_id: row.id,
                user_id: userId,
                detail: {
                    previous: previous
                        ? {
                            emails: parseEmails(previous.emails_destinatarios),
                            notificar_conta_pagar: previous.notificar_conta_pagar,
                            notificar_conta_receber: previous.notificar_conta_receber,
                            ativo: previous.ativo,
                        }
                        : null,
                    current: {
                        emails: parseEmails(row.emails_destinatarios),
                        notificar_conta_pagar: row.notificar_conta_pagar,
                        notificar_conta_receber: row.notificar_conta_receber,
                        ativo: row.ativo,
                    },
                },
            },
        })
    }

    return {
        emails: parseEmails(row.emails_destinatarios),
        notificar_conta_pagar: row.notificar_conta_pagar,
        notificar_conta_receber: row.notificar_conta_receber,
        ativo: row.ativo,
    }
}
