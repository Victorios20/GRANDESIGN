"use client"

import { useState } from "react"
import { Loader2, Plus, Trash2, BellRing } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfigurationPageIntro } from "@/components/configuracoes/ConfigurationChrome"
import {
    operationalListPrimaryButtonClass,
    operationalListShellClass,
} from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { EmailNotificationSettings } from "@/actions/financeiro/settings/notifications"

type Props = {
    initialSettings: EmailNotificationSettings
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function NotificationsPageClient({ initialSettings }: Props) {
    const [emails, setEmails] = useState<string[]>(initialSettings.emails ?? [])
    const [newEmail, setNewEmail] = useState("")
    const [notificarPagar, setNotificarPagar] = useState(initialSettings.notificar_conta_pagar)
    const [notificarReceber, setNotificarReceber] = useState(initialSettings.notificar_conta_receber)
    const [ativo, setAtivo] = useState(initialSettings.ativo)
    const [saving, setSaving] = useState(false)

    function addEmail() {
        const value = newEmail.trim().toLowerCase()
        if (!value) return
        if (!isValidEmail(value)) {
            toast.error("E-mail inválido")
            return
        }
        if (emails.includes(value)) {
            toast.error("E-mail já adicionado")
            return
        }
        setEmails([...emails, value])
        setNewEmail("")
    }

    function removeEmail(email: string) {
        setEmails(emails.filter((e) => e !== email))
    }

    async function handleSave() {
        try {
            setSaving(true)
            const response = await fetch("/api/financeiro/settings/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    emails,
                    notificar_conta_pagar: notificarPagar,
                    notificar_conta_receber: notificarReceber,
                    ativo,
                }),
            })

            const payload = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(payload?.error ?? "Erro ao salvar configuração de notificações")
            }

            const saved = payload as EmailNotificationSettings
            setEmails(saved.emails ?? [])
            setNotificarPagar(saved.notificar_conta_pagar)
            setNotificarReceber(saved.notificar_conta_receber)
            setAtivo(saved.ativo)
            toast.success("Notificações atualizadas com sucesso!")
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <ConfigurationPageIntro
                eyebrow="Configurações globais"
                title="Notificações por e-mail"
                description="Cadastre os destinatários que receberão um e-mail quando contas a pagar ou a receber forem criadas."
            />

            <div className="grid gap-6">
                <Card className={cn(operationalListShellClass, "overflow-hidden")}>
                    <CardHeader className="border-b border-[#2C201B]/5 bg-[#FAFAFA] px-6 py-4">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#2C201B]">
                            <BellRing className="size-4" />
                            Destinatários
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="novo-email" className="text-sm font-medium text-[#2C201B]/90">
                                    Adicionar e-mail
                                </Label>
                                <Input
                                    id="novo-email"
                                    type="email"
                                    placeholder="exemplo@grandesignce.com.br"
                                    value={newEmail}
                                    onChange={(event) => setNewEmail(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault()
                                            addEmail()
                                        }
                                    }}
                                    className="h-11 border-[#2C201B]/10 bg-white"
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={addEmail}
                                className={cn(operationalListPrimaryButtonClass, "h-11 px-4")}
                            >
                                <Plus className="mr-1 size-4" />
                                Adicionar
                            </Button>
                        </div>

                        {emails.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-[#2C201B]/15 px-4 py-6 text-center text-sm text-[#2C201B]/55">
                                Nenhum destinatário cadastrado. Adicione ao menos um e-mail para receber as notificações.
                            </p>
                        ) : (
                            <ul className="divide-y divide-[#2C201B]/5 rounded-lg border border-[#2C201B]/10">
                                {emails.map((email) => (
                                    <li key={email} className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-sm text-[#2C201B]">{email}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeEmail(email)}
                                            className="rounded-md p-1.5 text-[#8F3F37] transition-colors hover:bg-[#fef2f2]"
                                            aria-label={`Remover ${email}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card className={cn(operationalListShellClass, "overflow-hidden")}>
                    <CardHeader className="border-b border-[#2C201B]/5 bg-[#FAFAFA] px-6 py-4">
                        <CardTitle className="text-base font-semibold text-[#2C201B]">Eventos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 p-6">
                        <label className="flex items-center justify-between gap-4">
                            <span className="text-sm text-[#2C201B]/90">Notificar quando uma conta a pagar for criada</span>
                            <Switch checked={notificarPagar} onCheckedChange={setNotificarPagar} />
                        </label>
                        <label className="flex items-center justify-between gap-4">
                            <span className="text-sm text-[#2C201B]/90">Notificar quando uma conta a receber for criada</span>
                            <Switch checked={notificarReceber} onCheckedChange={setNotificarReceber} />
                        </label>
                        <div className="border-t border-[#2C201B]/5 pt-5">
                            <label className="flex items-center justify-between gap-4">
                                <span className="text-sm font-medium text-[#2C201B]/90">Notificações ativas</span>
                                <Switch checked={ativo} onCheckedChange={setAtivo} />
                            </label>
                            <p className="mt-1 text-xs text-[#2C201B]/55">
                                Quando desativado, nenhum e-mail é enviado, mesmo com destinatários cadastrados.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(operationalListPrimaryButtonClass, "h-11 px-8")}
                    >
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Salvar notificações
                    </Button>
                </div>
            </div>
        </div>
    )
}
