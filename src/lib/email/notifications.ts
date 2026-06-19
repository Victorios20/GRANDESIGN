import { Resend } from "resend"

import { getNotificationSettings } from "@/actions/financeiro/settings/notifications"
import { prisma } from "@/lib/prisma"

type ContaTipo = "PAGAR" | "RECEBER"

type NotifyContaInput = {
    id?: number
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

/** Base absoluta para montar links nos e-mails. Em produção, defina NEXTAUTH_URL. */
function getAppBaseUrl() {
    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ""
    return base.replace(/\/$/, "")
}

/**
 * Monta o link que abre a conta diretamente (reusa o deep-link `?highlight=<id>`
 * que abre o editor da conta na lista). Retorna null se não houver id/base.
 */
function buildContaLink(tipo: ContaTipo, id?: number) {
    const base = getAppBaseUrl()
    if (!id || !base) return null
    const path = tipo === "PAGAR" ? "contas-pagar" : "contas-receber"
    return `${base}/${path}?highlight=${id}`
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
        const link = buildContaLink(input.tipo, input.id)

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
                    ${link ? `<p style="margin: 20px 0;"><a href="${link}" style="display: inline-block; background-color: #8B5E3C; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold;">Abrir conta</a></p>` : ""}
                    <hr style="border: none; border-top: 1px solid #E8C99A; margin: 24px 0;" />
                    <p style="color: #999; font-size: 12px;">Notificação automática do sistema financeiro da Grandesign.</p>
                </div>
            `,
        })
    } catch (error) {
        console.error("[notifyContaCriada] Falha ao enviar notificação:", error)
    }
}

/**
 * Busca a conta a pagar pelo id (já commitada) e dispara a notificação.
 * Use após o commit da transação que criou a conta.
 */
export async function notifyContaPagarCriadaById(id: number): Promise<void> {
    try {
        const conta = await prisma.contaPagar.findUnique({
            where: { id },
            select: { id: true, descricao: true, valor_total: true, data_vencimento: true },
        })
        if (!conta) return
        await notifyContaCriada({
            id: conta.id,
            tipo: "PAGAR",
            descricao: conta.descricao,
            valor: Number(conta.valor_total),
            vencimento: conta.data_vencimento,
        })
    } catch (error) {
        console.error("[notifyContaPagarCriadaById] Falha:", error)
    }
}

/**
 * Busca a conta a receber pelo id (já commitada) e dispara a notificação.
 * Use após o commit da transação que criou a conta.
 */
export async function notifyContaReceberCriadaById(id: number): Promise<void> {
    try {
        const conta = await prisma.contaReceber.findUnique({
            where: { id },
            select: { id: true, descricao: true, valor_total: true, data_vencimento: true },
        })
        if (!conta) return
        await notifyContaCriada({
            id: conta.id,
            tipo: "RECEBER",
            descricao: conta.descricao,
            valor: Number(conta.valor_total),
            vencimento: conta.data_vencimento,
        })
    } catch (error) {
        console.error("[notifyContaReceberCriadaById] Falha:", error)
    }
}
