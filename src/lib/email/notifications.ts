import { Resend } from "resend"

import { getNotificationSettings } from "@/actions/financeiro/settings/notifications"

type ContaTipo = "PAGAR" | "RECEBER"

type NotifyContaInput = {
    tipo: ContaTipo
    descricao: string
    valor: number
    vencimento?: Date | string | null
}

function formatBRL(value: number) {
    try {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    } catch {
        return `R$ ${Number(value || 0).toFixed(2)}`
    }
}

function formatDate(value?: Date | string | null) {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(date)
}

/**
 * Notifica os destinatários configurados sobre a criação de uma conta a
 * pagar/receber. Fire-and-forget: qualquer erro é registrado mas nunca
 * interrompe o fluxo de criação da conta.
 */
export async function notifyContaCriada(input: NotifyContaInput): Promise<void> {
    try {
        const settings = await getNotificationSettings()
        if (!settings.ativo) return

        const enabled = input.tipo === "PAGAR" ? settings.notificar_conta_pagar : settings.notificar_conta_receber
        if (!enabled) return

        const recipients = settings.emails.filter(Boolean)
        if (recipients.length === 0) return

        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) {
            console.warn("[notifyContaCriada] RESEND_API_KEY ausente; e-mail não enviado.")
            return
        }

        const resend = new Resend(apiKey)
        const tipoLabel = input.tipo === "PAGAR" ? "Conta a pagar" : "Conta a receber"
        const venc = formatDate(input.vencimento)

        await resend.emails.send({
            from: "Suporte <suporte@grandesignce.com.br>",
            to: recipients,
            subject: `Nova ${tipoLabel.toLowerCase()} criada - Grandesign`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.5;">
                    <h2 style="color: #8B5E3C; margin-bottom: 16px;">${tipoLabel} criada</h2>
                    <p>Uma nova ${tipoLabel.toLowerCase()} foi registrada no sistema:</p>
                    <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
                        <tr>
                            <td style="padding: 6px 0; color: #666;">Descrição</td>
                            <td style="padding: 6px 0; font-weight: bold;">${input.descricao}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #666;">Valor</td>
                            <td style="padding: 6px 0; font-weight: bold;">${formatBRL(input.valor)}</td>
                        </tr>
                        ${venc ? `<tr><td style="padding: 6px 0; color: #666;">Vencimento</td><td style="padding: 6px 0; font-weight: bold;">${venc}</td></tr>` : ""}
                    </table>
                    <hr style="border: none; border-top: 1px solid #E8C99A; margin: 24px 0;" />
                    <p style="color: #999; font-size: 12px;">Notificação automática do sistema financeiro da Grandesign.</p>
                </div>
            `,
        })
    } catch (error) {
        console.error("[notifyContaCriada] Falha ao enviar notificação:", error)
    }
}
