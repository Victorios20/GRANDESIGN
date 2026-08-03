/**
 * Escapa texto vindo do banco antes de interpolar em HTML de e-mail.
 * Sem isso, uma descrição com `<`, `>` ou `&` quebra o layout da mensagem.
 */
export function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}
