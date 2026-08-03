/**
 * Erros do fluxo de salvar/gerar proposta, do lado do cliente.
 *
 * A geração de proposta é uma request longa (16–31s medidos em produção): ela
 * salva o rascunho, chama o gerador de PDF/slide e só então responde. Se a
 * conexão cair depois do salvamento, o `fetch` estoura um `TypeError` cru
 * ("Failed to fetch") e o usuário não descobre que o orçamento já existe —
 * e a retentativa com o mesmo título bate em DUPLICATE_TITLE.
 *
 * Estes tipos preservam essa informação até a camada de UI.
 */

export type OrcamentoExistente = {
    id: number
    slideUrl?: string | null
    pdfUrl?: string | null
}

/** Resposta de erro do servidor (a rota sempre responde JSON). */
export class ApiRequestError extends Error {
    readonly status: number
    readonly code?: string
    readonly step?: string
    readonly requestId?: string
    readonly existente?: OrcamentoExistente

    constructor(
        message: string,
        opts: {
            status: number
            code?: string
            step?: string
            requestId?: string
            existente?: OrcamentoExistente
        },
    ) {
        super(message)
        this.name = "ApiRequestError"
        this.status = opts.status
        this.code = opts.code
        this.step = opts.step
        this.requestId = opts.requestId
        this.existente = opts.existente
    }
}

export const CONNECTION_LOST_MESSAGE =
    "Conexão interrompida antes da resposta do servidor. O orçamento pode já ter sido salvo — confira na lista de orçamentos antes de tentar de novo."

/** A request saiu mas a resposta nunca chegou (rede, sleep, proxy). */
export class ConnectionLostError extends Error {
    constructor(readonly cause?: unknown) {
        super(CONNECTION_LOST_MESSAGE)
        this.name = "ConnectionLostError"
    }
}

export function isConnectionLost(err: unknown): err is ConnectionLostError {
    return err instanceof ConnectionLostError
}

export function isDuplicateTitleError(err: unknown): err is ApiRequestError {
    return err instanceof ApiRequestError && err.code === "DUPLICATE_TITLE"
}

/**
 * Extrai o orçamento já existente que o servidor devolve junto do 409, para a
 * UI poder oferecer "abrir o existente" em vez de só reclamar do título.
 */
export function parseExistente(details: unknown): OrcamentoExistente | undefined {
    if (!details || typeof details !== "object") return undefined
    const d = details as Record<string, unknown>
    const id = Number(d.id ?? (d.existente as Record<string, unknown> | undefined)?.id)
    if (!Number.isFinite(id) || id <= 0) return undefined

    const src = (d.id ? d : (d.existente as Record<string, unknown>)) ?? {}
    const slide = src.slideUrl ?? src.link_slide
    const pdf = src.pdfUrl ?? src.link_pdf

    return {
        id,
        slideUrl: typeof slide === "string" && slide.trim() ? slide : null,
        pdfUrl: typeof pdf === "string" && pdf.trim() ? pdf : null,
    }
}

/** Mensagem que vai pro toast. Nunca devolve "Failed to fetch". */
export function messageForOrcamentoFailure(err: unknown): string {
    if (isConnectionLost(err)) return CONNECTION_LOST_MESSAGE

    if (isDuplicateTitleError(err)) {
        return err.existente
            ? `Já existe o orçamento #${err.existente.id} com esse título.`
            : "Já existe um orçamento com esse título."
    }

    if (err instanceof ApiRequestError) return err.message

    // TypeError de fetch que não passou pelos wrappers acima.
    if (err instanceof TypeError) return CONNECTION_LOST_MESSAGE

    if (err instanceof Error && err.message.trim()) return err.message

    return "Erro inesperado ao gerar proposta."
}
