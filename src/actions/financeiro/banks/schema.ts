import { z } from "zod"
import { TipoContaBancaria } from "@prisma/client"

export const createBankSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório").max(100),
    tipo: z.nativeEnum(TipoContaBancaria),
    banco: z.string().max(100).optional(),
    agencia: z.string().max(20).optional(),
    conta: z.string().max(30).optional(),
    saldo_inicial: z.number().default(0),
    cor: z.string().max(7).optional(),
})

export const updateBankSchema = z.object({
    id: z.number(),
    nome: z.string().min(1).max(100).optional(),
    tipo: z.nativeEnum(TipoContaBancaria).optional(),
    banco: z.string().max(100).optional(),
    agencia: z.string().max(20).optional(),
    conta: z.string().max(30).optional(),
    cor: z.string().max(7).optional(),
    ativo: z.boolean().optional(),
    // saldo_inicial is NOT here because it has special rules
})

export type CreateBankInput = z.infer<typeof createBankSchema>
export type UpdateBankInput = z.infer<typeof updateBankSchema>
