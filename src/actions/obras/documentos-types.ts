// Tipos de documento disponíveis para upload
export type TipoDocumento =
    | "CONTRATO_ASSINADO"
    | "RECIBO"
    | "TERMO"
    | "OUTROS"

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
    CONTRATO_ASSINADO: "Contrato assinado",
    RECIBO: "Recibo",
    TERMO: "Termo",
    OUTROS: "Outros",
}

// Tipo de retorno do documento
export type ObraDocumento = {
    id: number
    obra_id: number
    tipo: TipoDocumento
    titulo: string
    url: string | null
    link: string | null
    created_at: Date
}
